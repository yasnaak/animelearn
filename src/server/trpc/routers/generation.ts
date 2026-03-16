import { router, protectedProcedure } from '../init';
import {
  projects,
  episodes,
  characters,
  panels,
  audioTracks,
  generationJobs,
  appProfiles,
  locations,
  shots,
} from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  analyzeContent,
  planSeries,
  generateScript,
  validateScript,
  generateVisualPrompts,
  generateAudioDirection,
  generateScreenplay,
  generateAudioDirectionV2,
  type ContentAnalysis,
  type SeriesPlan,
  type EpisodeScript,
  type Screenplay,
  type VisualPromptsResult,
  type AudioDirection,
  type AudioDirectionV2,
  type PreviousEpisodeContext,
  generateYouTubeMetadata,
} from '@/server/services/ai-pipeline';
import {
  generateCharacterSheet,
  generateCharacterSheetV2,
  generatePanelLayers,
  removeBackground,
  generateImage,
  getStyleModifiers,
  generateLocationReference,
  generateShotImage,
  animateShot,
  generateThumbnail,
} from '@/server/services/fal';
import { PLAN_LIMITS } from '@/lib/stripe';
import {
  generateSpeech,
  generateSoundEffect,
  generateMusic,
  getVoiceForRole,
  deliveryToVoiceSettings,
} from '@/server/services/elevenlabs';
import {
  generateSceneClip,
  mapParallaxToCamera,
} from '@/server/services/replicate';

export const generationRouter = router({
  // Phase 1+2: Analyze content and plan series
  analyze: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      const p = project[0];
      if (!p || p.userId !== ctx.user.id) {
        throw new Error('Project not found');
      }

      if (!p.rawContent) {
        throw new Error('No content to analyze. Please add content to your project first.');
      }

      // Update status to analyzing
      await ctx.db
        .update(projects)
        .set({ status: 'analyzing', updatedAt: new Date() })
        .where(eq(projects.id, input.projectId));

      try {
        // Phase 1: Content Analysis
        const analysisResult = await analyzeContent(
          p.rawContent,
          p.sourceType as 'pdf' | 'youtube' | 'text' | 'idea' | 'url',
          p.language,
        );

        await ctx.db
          .update(projects)
          .set({
            contentAnalysis: analysisResult.data,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, input.projectId));

        // Phase 2: Series Planning
        const planResult = await planSeries(
          analysisResult.data,
          p.style,
          p.language,
        );

        // Save characters
        for (const char of planResult.data.characters) {
          await ctx.db.insert(characters).values({
            projectId: input.projectId,
            name: char.name,
            role: char.role,
            visualDescription: char.visual_description,
            personality: char as unknown as Record<string, unknown>,
          });
        }

        // Create episode entries
        for (const ep of planResult.data.episodes) {
          await ctx.db.insert(episodes).values({
            projectId: input.projectId,
            episodeNumber: ep.episode_number,
            title: ep.title,
            synopsis: ep.synopsis,
            status: 'planned',
          });
        }

        await ctx.db
          .update(projects)
          .set({
            seriesPlan: planResult.data,
            totalEpisodes: planResult.data.series.total_episodes,
            status: 'planned',
            updatedAt: new Date(),
          })
          .where(eq(projects.id, input.projectId));

        return {
          success: true,
          analysis: analysisResult.data,
          plan: planResult.data,
          tokensUsed: {
            analysis: analysisResult.inputTokens + analysisResult.outputTokens,
            planning: planResult.inputTokens + planResult.outputTokens,
          },
        };
      } catch (error) {
        await ctx.db
          .update(projects)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(projects.id, input.projectId));
        throw error;
      }
    }),

  // Phase 3: Generate script for a single episode
  generateScript: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        episodeNumber: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      const p = project[0];
      if (!p || p.userId !== ctx.user.id) {
        throw new Error('Project not found');
      }

      if (!p.contentAnalysis || !p.seriesPlan) {
        throw new Error('Project must be analyzed first');
      }

      const analysis = p.contentAnalysis as unknown as ContentAnalysis;
      const plan = p.seriesPlan as unknown as SeriesPlan;

      // Find the episode entry
      const episodeRows = await ctx.db
        .select()
        .from(episodes)
        .where(eq(episodes.projectId, input.projectId));

      const episode = episodeRows.find(
        (e) => e.episodeNumber === input.episodeNumber,
      );
      if (!episode) {
        throw new Error(`Episode ${input.episodeNumber} not found`);
      }

      // Update episode status
      await ctx.db
        .update(episodes)
        .set({ status: 'script', updatedAt: new Date() })
        .where(eq(episodes.id, episode.id));

      try {
        // Gather context from previous episodes
        const previousEpisodes: PreviousEpisodeContext[] = [];
        if (input.episodeNumber > 1) {
          const readyEpisodes = episodeRows
            .filter(
              (e) =>
                e.episodeNumber < input.episodeNumber &&
                e.status === 'ready' &&
                e.script,
            )
            .sort((a, b) => a.episodeNumber - b.episodeNumber);

          for (const prev of readyEpisodes) {
            const prevScript = prev.script as unknown as EpisodeScript;
            const prevPlanEp = plan.episodes.find(
              (ep) => ep.episode_number === prev.episodeNumber,
            );
            previousEpisodes.push({
              episodeNumber: prev.episodeNumber,
              title: prev.title,
              summaryPoints: prevScript.end_card?.call_to_action ?? [],
              teaserNextEpisode: prevScript.end_card?.teaser_next_episode ?? null,
              cliffhanger: prevPlanEp?.cliffhanger ?? null,
              storyBeats: prevPlanEp?.story_beats ?? [],
            });
          }
        }

        // Generate script (uses Opus)
        const scriptResult = await generateScript(
          analysis,
          plan,
          input.episodeNumber,
          p.language,
          p.targetDurationMinutes,
          previousEpisodes,
        );

        // Validate script (uses Sonnet)
        const validation = await validateScript(
          scriptResult.data,
          plan,
          analysis,
          input.episodeNumber,
        );

        // Store script + validation
        await ctx.db
          .update(episodes)
          .set({
            script: scriptResult.data as unknown as Record<string, unknown>,
            status: validation.data.is_valid ? 'visuals' : 'script',
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, episode.id));

        return {
          success: true,
          script: scriptResult.data,
          validation: validation.data,
          tokensUsed: {
            script: scriptResult.inputTokens + scriptResult.outputTokens,
            validation: validation.inputTokens + validation.outputTokens,
          },
        };
      } catch (error) {
        await ctx.db
          .update(episodes)
          .set({
            status: 'failed',
            generationError:
              error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, episode.id));
        throw error;
      }
    }),

  // Get episodes for a project
  listEpisodes: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(episodes)
        .where(eq(episodes.projectId, input.projectId))
        .orderBy(episodes.episodeNumber);
    }),

  // Get generation progress for an episode
  getProgress: protectedProcedure
    .input(z.object({ episodeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const jobs = await ctx.db
        .select()
        .from(generationJobs)
        .where(eq(generationJobs.episodeId, input.episodeId))
        .limit(1);

      return jobs[0] ?? null;
    }),

  // Full auto-generation: one button → complete episode
  generateEpisode: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        episodeNumber: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      const p = project[0];
      if (!p || p.userId !== ctx.user.id) throw new Error('Project not found');
      if (!p.contentAnalysis || !p.seriesPlan) {
        throw new Error('Project must be analyzed first');
      }

      // Quota enforcement
      const limit = PLAN_LIMITS[ctx.profile.tier] ?? 1;
      if (ctx.profile.episodesUsedThisMonth >= limit) {
        throw new Error(
          `You've reached your monthly limit of ${limit} episode${limit !== 1 ? 's' : ''}. Upgrade your plan to generate more.`,
        );
      }

      const analysis = p.contentAnalysis as unknown as ContentAnalysis;
      const plan = p.seriesPlan as unknown as SeriesPlan;

      const episodeRows = await ctx.db
        .select()
        .from(episodes)
        .where(eq(episodes.projectId, input.projectId));

      const episode = episodeRows.find(
        (e) => e.episodeNumber === input.episodeNumber,
      );
      if (!episode) throw new Error('Episode not found');

      // Create generation job for progress tracking
      const [job] = await ctx.db
        .insert(generationJobs)
        .values({
          episodeId: episode.id,
          currentStep: 'script',
          progress: 0,
          stepsCompleted: [],
        })
        .returning();

      const jobId = job.id;

      const updateProgress = async (
        step: string,
        progress: number,
        completedSteps: string[],
      ) => {
        await ctx.db
          .update(generationJobs)
          .set({
            currentStep: step,
            progress,
            stepsCompleted: completedSteps,
          })
          .where(eq(generationJobs.id, jobId));
      };

      await ctx.db
        .update(episodes)
        .set({
          status: 'script',
          generationStartedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(episodes.id, episode.id));

      const completed: string[] = [];

      try {
        // ── Step 1: Generate Script ──
        await updateProgress('script', 5, completed);

        // Gather context from previous episodes for series coherence
        const previousEpisodes: PreviousEpisodeContext[] = [];
        if (input.episodeNumber > 1) {
          const readyEpisodes = episodeRows
            .filter(
              (e) =>
                e.episodeNumber < input.episodeNumber &&
                e.status === 'ready' &&
                e.script,
            )
            .sort((a, b) => a.episodeNumber - b.episodeNumber);

          for (const prev of readyEpisodes) {
            const prevScript = prev.script as unknown as EpisodeScript;
            const prevPlanEp = plan.episodes.find(
              (ep) => ep.episode_number === prev.episodeNumber,
            );
            previousEpisodes.push({
              episodeNumber: prev.episodeNumber,
              title: prev.title,
              summaryPoints: prevScript.end_card?.call_to_action ?? [],
              teaserNextEpisode: prevScript.end_card?.teaser_next_episode ?? null,
              cliffhanger: prevPlanEp?.cliffhanger ?? null,
              storyBeats: prevPlanEp?.story_beats ?? [],
            });
          }
        }

        const scriptResult = await generateScript(
          analysis,
          plan,
          input.episodeNumber,
          p.language,
          p.targetDurationMinutes,
          previousEpisodes,
        );
        const validation = await validateScript(
          scriptResult.data,
          plan,
          analysis,
          input.episodeNumber,
        );

        await ctx.db
          .update(episodes)
          .set({
            script: scriptResult.data as unknown as Record<string, unknown>,
            status: 'visuals',
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, episode.id));

        completed.push('script');
        await updateProgress('characters', 15, completed);

        const script = scriptResult.data as EpisodeScript;

        // ── Step 2: Character Sheets ──
        const chars = await ctx.db
          .select()
          .from(characters)
          .where(eq(characters.projectId, input.projectId));

        for (const char of chars) {
          if (!char.characterSheetUrl) {
            const sheet = await generateCharacterSheet(
              char.visualDescription,
              p.style,
            );
            await ctx.db
              .update(characters)
              .set({ characterSheetUrl: sheet.url })
              .where(eq(characters.id, char.id));
          }
        }

        completed.push('characters');
        await updateProgress('visual_prompts', 25, completed);

        // ── Step 3: Visual Prompts ──
        const vpResult = await generateVisualPrompts(script, plan, p.style);

        await ctx.db
          .update(episodes)
          .set({
            visualPrompts: vpResult.data as unknown as Record<string, unknown>,
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, episode.id));

        completed.push('visual_prompts');
        await updateProgress('video_clips', 35, completed);

        const visualPrompts = vpResult.data as VisualPromptsResult;

        // ── Step 4: Video Clips (fal.ai still + LTX-2.3 animate) ──
        const styleMod = getStyleModifiers(p.style);

        for (let i = 0; i < visualPrompts.panels.length; i++) {
          const vp = visualPrompts.panels[i];
          const panelProgress = 35 + Math.round((i / visualPrompts.panels.length) * 25);
          await updateProgress('video_clips', panelProgress, completed);

          let parallaxBgMovement = 'static';
          let panelOrder = 0;
          let sceneId = 's01';

          for (const scene of script.scenes) {
            const idx = scene.panels.findIndex(
              (sp) => sp.panel_id === vp.panel_id,
            );
            if (idx >= 0) {
              parallaxBgMovement =
                scene.panels[idx].parallax?.background_movement ?? 'static';
              sceneId = scene.scene_id;
              panelOrder = script.scenes
                .flatMap((s) => s.panels)
                .findIndex((sp) => sp.panel_id === vp.panel_id);
              break;
            }
          }

          // Generate reference still image
          const bgPrompt = styleMod.prompt + ', ' + vp.layers.background.prompt;
          const referenceImage = await generateImage({
            prompt: bgPrompt,
            negativePrompt: styleMod.negative,
            width: 1920,
            height: 1080,
          });

          // Animate with LTX-2.3
          const cameraMotion = mapParallaxToCamera(parallaxBgMovement);
          const videoPrompt =
            vp.layers.background.prompt +
            ', ' +
            vp.composition_notes +
            ', anime scene, cinematic';

          const video = await generateSceneClip({
            prompt: videoPrompt,
            referenceImageUrl: referenceImage.url,
            cameraMotion,
            duration: 6,
            usePro: false,
          });

          await ctx.db.insert(panels).values({
            episodeId: episode.id,
            sceneId,
            panelId: vp.panel_id,
            panelOrder: panelOrder >= 0 ? panelOrder : 0,
            backgroundImageUrl: referenceImage.url,
            videoUrl: video.videoUrl,
            prompt: vp as unknown as Record<string, unknown>,
            metadata: {
              cameraMotion,
              durationSeconds: video.durationSeconds,
            },
          });
        }

        completed.push('video_clips');
        await updateProgress('audio_direction', 62, completed);

        // ── Step 5: Audio Direction ──
        const adResult = await generateAudioDirection(
          script,
          plan,
          episode.episodeNumber,
          p.language,
        );

        await ctx.db
          .update(episodes)
          .set({
            audioDirection: adResult.data as unknown as Record<string, unknown>,
            status: 'audio',
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, episode.id));

        completed.push('audio_direction');
        await updateProgress('audio', 68, completed);

        const direction = adResult.data as AudioDirection;

        // ── Step 6: Generate Audio ──
        const updatedChars = await ctx.db
          .select()
          .from(characters)
          .where(eq(characters.projectId, input.projectId));

        const charVoiceMap = new Map<string, string>();
        for (const char of updatedChars) {
          const personality = char.personality as Record<string, unknown> | null;
          const charId = (personality?.id as string) ?? char.id;
          const voiceId = char.voiceId ?? getVoiceForRole(char.role);
          charVoiceMap.set(charId, voiceId);
        }

        // Dialogue + Narration + SFX
        for (let i = 0; i < direction.audio_timeline.length; i++) {
          const entry = direction.audio_timeline[i];
          const audioProgress =
            68 + Math.round((i / direction.audio_timeline.length) * 18);
          await updateProgress('audio', audioProgress, completed);

          for (const line of entry.dialogue) {
            if (!line.text) continue;
            const voiceId = charVoiceMap.get(line.character_id);
            if (!voiceId) continue;

            const voiceSettings =
              direction.voice_assignments[line.character_id]?.base_settings;

            const tts = await generateSpeech({
              text: line.text,
              voiceId,
              stability:
                line.emotion_override?.stability ??
                voiceSettings?.stability ??
                0.5,
              similarityBoost: voiceSettings?.similarity_boost ?? 0.75,
              style: voiceSettings?.style ?? 0.3,
              speed: line.emotion_override?.speed ?? 1.0,
            });

            const audioUrl =
              'data:audio/mp3;base64,' + tts.audioBuffer.toString('base64');

            await ctx.db.insert(audioTracks).values({
              episodeId: episode.id,
              trackType: 'dialogue',
              characterId: updatedChars.find((c) => {
                const pers = c.personality as Record<string, unknown> | null;
                return (pers?.id as string) === line.character_id;
              })?.id,
              audioUrl,
              durationMs: tts.durationMs,
              panelId: entry.panel_id,
              metadata: {
                text: line.text,
                characterId: line.character_id,
                emotion: line.emotion_override,
              },
            });
          }

          if (entry.narration?.text) {
            const narratorVoice = getVoiceForRole('narrator');
            const tts = await generateSpeech({
              text: entry.narration.text,
              voiceId: narratorVoice,
              stability: 0.6,
              similarityBoost: 0.8,
              style: 0.2,
              speed: entry.narration.speed ?? 1.0,
            });
            const audioUrl =
              'data:audio/mp3;base64,' + tts.audioBuffer.toString('base64');

            await ctx.db.insert(audioTracks).values({
              episodeId: episode.id,
              trackType: 'narration',
              audioUrl,
              durationMs: tts.durationMs,
              panelId: entry.panel_id,
              metadata: { text: entry.narration.text },
            });
          }

          if (entry.sfx?.description) {
            try {
              const sfx = await generateSoundEffect(entry.sfx.description, 3);
              const audioUrl =
                'data:audio/mp3;base64,' + sfx.audioBuffer.toString('base64');

              await ctx.db.insert(audioTracks).values({
                episodeId: episode.id,
                trackType: 'sfx',
                audioUrl,
                durationMs: sfx.durationMs,
                panelId: entry.panel_id,
                metadata: {
                  description: entry.sfx.description,
                  timing: entry.sfx.timing,
                  volume: entry.sfx.volume,
                },
              });
            } catch {
              // SFX is non-critical
            }
          }
        }

        // Music tracks
        await updateProgress('music', 88, completed);

        for (const track of direction.music_tracks) {
          try {
            const music = await generateMusic(
              track.prompt,
              track.duration_seconds,
            );

            await ctx.db.insert(audioTracks).values({
              episodeId: episode.id,
              trackType: 'music',
              audioUrl: music.audioUrl,
              durationMs: music.durationMs,
              metadata: {
                trackId: track.track_id,
                prompt: track.prompt,
                mood: track.mood,
                loop: track.loop,
              },
            });
          } catch {
            // Music is non-critical
          }
        }

        completed.push('audio');

        await updateProgress('finishing', 93, completed);

        // ── Step 8: YouTube Metadata + Thumbnail (non-critical) ──
        try {
          // Re-fetch episode to get latest screenplay data
          const freshEp = (
            await ctx.db
              .select()
              .from(episodes)
              .where(eq(episodes.id, episode.id))
              .limit(1)
          )[0];
          const freshScreenplay = freshEp?.screenplay as unknown as Screenplay | null;
          if (freshScreenplay?.acts?.length) {
            const ytResult = await generateYouTubeMetadata(
              freshScreenplay,
              episode.title,
              plan.series.title,
              p.language,
            );
            const ytData = ytResult.data as unknown as Record<string, unknown>;
            await ctx.db
              .update(episodes)
              .set({ youtubeMetadata: ytData })
              .where(eq(episodes.id, episode.id));

            // Generate thumbnail from metadata prompt
            const thumbPrompt = (ytData as { thumbnail_prompt?: string }).thumbnail_prompt;
            if (thumbPrompt) {
              try {
                const thumbUrl = await generateThumbnail({ prompt: thumbPrompt, style: p.style });
                await ctx.db
                  .update(episodes)
                  .set({ thumbnailUrl: thumbUrl })
                  .where(eq(episodes.id, episode.id));
              } catch {
                console.warn('[V1] Thumbnail generation failed, continuing...');
              }
            }
          }
        } catch {
          console.warn('[V1] YouTube metadata generation failed, continuing...');
        }

        await updateProgress('finishing', 97, completed);

        // ── Step 9: Mark ready ──
        await ctx.db
          .update(episodes)
          .set({
            status: 'ready',
            generationCompletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, episode.id));

        completed.push('complete');
        await updateProgress('complete', 100, completed);
        await ctx.db
          .update(generationJobs)
          .set({ completedAt: new Date() })
          .where(eq(generationJobs.id, jobId));

        // Increment monthly usage
        await ctx.db
          .update(appProfiles)
          .set({
            episodesUsedThisMonth: ctx.profile.episodesUsedThisMonth + 1,
            updatedAt: new Date(),
          })
          .where(eq(appProfiles.id, ctx.profile.id));

        return { success: true, episodeId: episode.id };
      } catch (error) {
        await ctx.db
          .update(episodes)
          .set({
            status: 'failed',
            generationError:
              error instanceof Error ? error.message : 'Generation failed',
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, episode.id));

        await ctx.db
          .update(generationJobs)
          .set({
            error:
              error instanceof Error ? error.message : 'Generation failed',
            completedAt: new Date(),
          })
          .where(eq(generationJobs.id, jobId));

        throw error;
      }
    }),

  // =================================================================
  // V2: Shot-based generation pipeline (cinematic anime production)
  // =================================================================
  generateEpisodeV2: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        episodeNumber: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      const p = project[0];
      if (!p || p.userId !== ctx.user.id) throw new Error('Project not found');
      if (!p.contentAnalysis || !p.seriesPlan) {
        throw new Error('Project must be analyzed first');
      }

      // Quota enforcement
      const limit = PLAN_LIMITS[ctx.profile.tier] ?? 1;
      if (ctx.profile.episodesUsedThisMonth >= limit) {
        throw new Error(
          `Monthly limit of ${limit} episode${limit !== 1 ? 's' : ''} reached. Upgrade to generate more.`,
        );
      }

      const analysis = p.contentAnalysis as unknown as ContentAnalysis;
      const plan = p.seriesPlan as unknown as SeriesPlan;

      const episodeRows = await ctx.db
        .select()
        .from(episodes)
        .where(eq(episodes.projectId, input.projectId));

      const episode = episodeRows.find(
        (e) => e.episodeNumber === input.episodeNumber,
      );
      if (!episode) throw new Error('Episode not found');

      // Create generation job
      const [job] = await ctx.db
        .insert(generationJobs)
        .values({
          episodeId: episode.id,
          currentStep: 'screenplay',
          progress: 0,
          stepsCompleted: [],
        })
        .returning();

      const jobId = job.id;

      const updateProgress = async (
        step: string,
        progress: number,
        completedSteps: string[],
      ) => {
        await ctx.db
          .update(generationJobs)
          .set({ currentStep: step, progress, stepsCompleted: completedSteps })
          .where(eq(generationJobs.id, jobId));
      };

      await ctx.db
        .update(episodes)
        .set({
          status: 'script',
          generationStartedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(episodes.id, episode.id));

      const completed: string[] = [];

      try {
        // ── Step 1: Screenplay (0-5%) ──
        await updateProgress('screenplay', 2, completed);

        const previousEpisodes: PreviousEpisodeContext[] = [];
        if (input.episodeNumber > 1) {
          const readyEpisodes = episodeRows
            .filter(
              (e) =>
                e.episodeNumber < input.episodeNumber &&
                e.status === 'ready' &&
                (e.screenplay || e.script),
            )
            .sort((a, b) => a.episodeNumber - b.episodeNumber);

          for (const prev of readyEpisodes) {
            const prevScreenplay = prev.screenplay as unknown as Screenplay | null;
            const prevScript = prev.script as unknown as EpisodeScript | null;
            const prevPlanEp = plan.episodes.find(
              (ep) => ep.episode_number === prev.episodeNumber,
            );
            previousEpisodes.push({
              episodeNumber: prev.episodeNumber,
              title: prev.title,
              summaryPoints:
                prevScreenplay?.end_card?.call_to_action ??
                prevScript?.end_card?.call_to_action ??
                [],
              teaserNextEpisode:
                prevScreenplay?.end_card?.teaser_next_episode ??
                prevScript?.end_card?.teaser_next_episode ??
                null,
              cliffhanger: prevPlanEp?.cliffhanger ?? null,
              storyBeats: prevPlanEp?.story_beats ?? [],
            });
          }
        }

        const screenplayResult = await generateScreenplay(
          analysis,
          plan,
          input.episodeNumber,
          p.language,
          p.targetDurationMinutes,
          previousEpisodes,
        );

        const screenplay = screenplayResult.data;

        // Validate screenplay has shots
        const totalShotCount = screenplay.acts.reduce(
          (sum, act) =>
            sum +
            act.scenes.reduce(
              (s, scene) =>
                s +
                scene.beats.reduce(
                  (b, beat) => b + beat.shots.length,
                  0,
                ),
              0,
            ),
          0,
        );
        if (totalShotCount === 0) {
          throw new Error(
            'Screenplay generated 0 shots — cannot produce episode',
          );
        }

        await ctx.db
          .update(episodes)
          .set({
            screenplay: screenplay as unknown as Record<string, unknown>,
            status: 'visuals',
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, episode.id));

        completed.push('screenplay');
        await updateProgress('locations', 5, completed);

        // ── Step 2: Location References (5-8%) ──
        const existingLocations = await ctx.db
          .select()
          .from(locations)
          .where(eq(locations.projectId, input.projectId));

        const existingLocMap = new Map(
          existingLocations.map((l) => [l.locationId, l]),
        );

        for (const loc of screenplay.locations) {
          if (!existingLocMap.has(loc.location_id)) {
            try {
              const locImage = await generateLocationReference({
                referencePrompt: loc.reference_prompt,
                style: p.style,
                colorPalette: loc.color_palette,
              });

              await ctx.db.insert(locations).values({
                projectId: input.projectId,
                locationId: loc.location_id,
                name: loc.name,
                description: loc.description,
                keyFeatures: loc.key_features,
                referenceImageUrl: locImage.url,
                referencePrompt: loc.reference_prompt,
                colorPalette: loc.color_palette,
                metadata: { seed: locImage.seed },
              });

              existingLocMap.set(loc.location_id, {
                id: '',
                projectId: input.projectId,
                locationId: loc.location_id,
                name: loc.name,
                description: loc.description,
                keyFeatures: loc.key_features,
                referenceImageUrl: locImage.url,
                referencePrompt: loc.reference_prompt,
                colorPalette: loc.color_palette,
                metadata: { seed: locImage.seed },
                createdAt: new Date(),
              });
            } catch (err) {
              console.warn(
                `[V2] Location ref failed for ${loc.location_id}, continuing without reference:`,
                err,
              );
            }
          }
        }

        completed.push('locations');
        await updateProgress('characters', 8, completed);

        // ── Step 3: Character Sheets (8-12%) ──
        const chars = await ctx.db
          .select()
          .from(characters)
          .where(eq(characters.projectId, input.projectId));

        for (const char of chars) {
          if (!char.characterSheetUrl) {
            try {
              const personality = char.personality as Record<string, unknown> | null;
              const signatureFeatures =
                (char.signatureFeatures as string[]) ??
                (personality?.personality_traits as string[]) ??
                [];

              const sheet = await generateCharacterSheetV2({
                visualDescription: char.visualDescription,
                signatureFeatures,
                style: p.style,
              });

              await ctx.db
                .update(characters)
                .set({
                  characterSheetUrl: sheet.url,
                  signatureFeatures: signatureFeatures,
                })
                .where(eq(characters.id, char.id));

              char.characterSheetUrl = sheet.url;
            } catch (err) {
              console.warn(
                `[V2] Character sheet failed for ${char.id}, continuing without reference:`,
                err,
              );
            }
          }
        }

        completed.push('characters');
        await updateProgress('shot_images', 12, completed);

        // ── Step 4: Shot Images (12-55%) ──
        // Flatten all shots from screenplay
        const allShots = screenplay.acts.flatMap((act) =>
          act.scenes.flatMap((scene) =>
            scene.beats.flatMap((beat) =>
              beat.shots.map((shot) => ({
                ...shot,
                sceneId: scene.scene_id,
                locationId: scene.location_id,
              })),
            ),
          ),
        );

        // Build character ref map (charId from plan → character sheet URL)
        const charRefMap = new Map<string, string>();
        for (const char of chars) {
          const personality = char.personality as Record<string, unknown> | null;
          const charId = (personality?.id as string) ?? char.id;
          if (char.characterSheetUrl) {
            charRefMap.set(charId, char.characterSheetUrl);
          }
        }

        // Generate shot images in batches of 4
        const SHOT_IMAGE_BATCH = 4;
        for (let i = 0; i < allShots.length; i += SHOT_IMAGE_BATCH) {
          const batch = allShots.slice(i, i + SHOT_IMAGE_BATCH);
          const progress = 12 + Math.round((i / allShots.length) * 43);
          await updateProgress('shot_images', progress, completed);

          const results = await Promise.all(
            batch.map((shot) => {
              const locationRef = existingLocMap.get(shot.locationId);
              // For character ref, use the first character in the shot
              const firstCharId = shot.subject.character_ids[0];
              const charRef = firstCharId
                ? charRefMap.get(firstCharId)
                : undefined;

              return generateShotImage({
                shotId: shot.shot_id,
                shotType: shot.shot_type,
                visualDirection: shot.visual_direction,
                style: p.style,
                locationRefUrl: locationRef?.referenceImageUrl ?? undefined,
                characterRefUrl: charRef,
              }).catch((err) => {
                console.warn(
                  `[V2] Shot image failed for ${shot.shot_id}:`,
                  err,
                );
                return null;
              });
            }),
          );

          // Save shot records to DB
          for (let j = 0; j < results.length; j++) {
            const result = results[j];
            if (!result) continue; // Skip failed shots
            const shot = batch[j];

            await ctx.db.insert(shots).values({
              episodeId: episode.id,
              sceneId: shot.sceneId,
              shotId: shot.shot_id,
              shotOrder: i + j,
              shotType: shot.shot_type,
              referenceImageUrl: result.imageUrl,
              durationSeconds: shot.duration_seconds,
              prompt: {
                visual_direction: shot.visual_direction,
                framing: shot.framing,
              } as Record<string, unknown>,
              metadata: {
                seed: result.seed,
                camera: shot.camera,
              } as Record<string, unknown>,
            });
          }
        }

        completed.push('shot_images');
        await updateProgress('shot_animation', 55, completed);

        // ── Step 5: Shot Animation (55-85%) ──
        const shotRecords = await ctx.db
          .select()
          .from(shots)
          .where(eq(shots.episodeId, episode.id));

        const ANIMATION_BATCH = 3;
        for (let i = 0; i < shotRecords.length; i += ANIMATION_BATCH) {
          const batch = shotRecords.slice(i, i + ANIMATION_BATCH);
          const progress = 55 + Math.round((i / shotRecords.length) * 30);
          await updateProgress('shot_animation', progress, completed);

          const results = await Promise.all(
            batch.map((rec) => {
              if (!rec.referenceImageUrl) {
                return Promise.resolve(null);
              }

              // Find the screenplay shot for camera/action info
              const screenplayShot = allShots.find(
                (s) => s.shot_id === rec.shotId,
              );

              const dur = rec.durationSeconds;
              const validDuration: 3 | 4 | 5 =
                dur === 3 || dur === 4 || dur === 5 ? dur : 5;

              return animateShot({
                shotId: rec.shotId,
                stillImageUrl: rec.referenceImageUrl,
                cameraMovement: screenplayShot?.camera.movement ?? 'static',
                actions: screenplayShot?.subject.actions ?? [],
                mood: 'cinematic',
                durationSeconds: validDuration,
              }).catch((err) => {
                console.warn(
                  `[V2] Animation failed for shot ${rec.shotId}:`,
                  err,
                );
                return null;
              });
            }),
          );

          // Update DB with video URLs
          for (const result of results) {
            if (result?.videoUrl) {
              await ctx.db
                .update(shots)
                .set({ videoUrl: result.videoUrl })
                .where(eq(shots.shotId, result.shotId));
            }
          }
        }

        completed.push('shot_animation');
        await updateProgress('audio_direction', 85, completed);

        // ── Step 6: Audio Direction V2 (85-88%) ──
        const adResult = await generateAudioDirectionV2(
          screenplay,
          plan,
          episode.episodeNumber,
          p.language,
        );

        await ctx.db
          .update(episodes)
          .set({
            audioDirection: adResult.data as unknown as Record<string, unknown>,
            status: 'audio',
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, episode.id));

        completed.push('audio_direction');
        await updateProgress('audio', 88, completed);

        const direction = adResult.data as AudioDirectionV2;

        // ── Step 7: TTS + SFX + Music (88-95%) ──
        const updatedChars = await ctx.db
          .select()
          .from(characters)
          .where(eq(characters.projectId, input.projectId));

        const charVoiceMap = new Map<string, string>();
        for (const char of updatedChars) {
          const personality = char.personality as Record<string, unknown> | null;
          const charId = (personality?.id as string) ?? char.id;
          const voiceId = char.voiceId ?? getVoiceForRole(char.role);
          charVoiceMap.set(charId, voiceId);
        }

        for (let i = 0; i < direction.audio_timeline.length; i++) {
          const entry = direction.audio_timeline[i];
          const audioProgress =
            88 + Math.round((i / direction.audio_timeline.length) * 5);
          await updateProgress('audio', audioProgress, completed);

          // Dialogue
          for (const line of entry.dialogue) {
            if (!line.text) continue;
            const voiceId = charVoiceMap.get(line.character_id);
            if (!voiceId) {
              console.warn(
                `[V2] No voice found for character ${line.character_id}, skipping dialogue`,
              );
              continue;
            }

            const baseSettings =
              direction.voice_assignments[line.character_id]?.base_settings;
            const deliverySettings = deliveryToVoiceSettings(line.delivery);

            const tts = await generateSpeech({
              text: line.text,
              voiceId,
              stability: deliverySettings.stability,
              similarityBoost:
                baseSettings?.similarity_boost ??
                deliverySettings.similarityBoost,
              style: deliverySettings.style,
              speed: deliverySettings.speed,
            });

            const audioUrl =
              'data:audio/mp3;base64,' + tts.audioBuffer.toString('base64');

            await ctx.db.insert(audioTracks).values({
              episodeId: episode.id,
              trackType: 'dialogue',
              characterId: updatedChars.find((c) => {
                const pers = c.personality as Record<string, unknown> | null;
                return (pers?.id as string) === line.character_id;
              })?.id,
              audioUrl,
              durationMs: tts.durationMs,
              shotId: entry.shot_id,
              metadata: {
                text: line.text,
                characterId: line.character_id,
                characterName: line.character_name,
                delivery: line.delivery,
              },
            });
          }

          // Narration
          if (entry.narration?.text) {
            const narratorVoice = getVoiceForRole('narrator');
            const tts = await generateSpeech({
              text: entry.narration.text,
              voiceId: narratorVoice,
              stability: 0.6,
              similarityBoost: 0.8,
              style: 0.4,
              speed: entry.narration.speed ?? 1.0,
            });
            const audioUrl =
              'data:audio/mp3;base64,' + tts.audioBuffer.toString('base64');

            await ctx.db.insert(audioTracks).values({
              episodeId: episode.id,
              trackType: 'narration',
              audioUrl,
              durationMs: tts.durationMs,
              shotId: entry.shot_id,
              metadata: { text: entry.narration.text },
            });
          }

          // SFX
          if (entry.sfx?.description) {
            try {
              const sfx = await generateSoundEffect(entry.sfx.description, 3);
              const audioUrl =
                'data:audio/mp3;base64,' + sfx.audioBuffer.toString('base64');

              await ctx.db.insert(audioTracks).values({
                episodeId: episode.id,
                trackType: 'sfx',
                audioUrl,
                durationMs: sfx.durationMs,
                shotId: entry.shot_id,
                metadata: {
                  description: entry.sfx.description,
                  timing: entry.sfx.timing,
                  volume: entry.sfx.volume,
                },
              });
            } catch {
              // SFX is non-critical
            }
          }
        }

        // Music tracks
        await updateProgress('music', 93, completed);

        for (const track of direction.music_tracks) {
          try {
            const music = await generateMusic(
              track.prompt,
              track.duration_seconds,
            );

            await ctx.db.insert(audioTracks).values({
              episodeId: episode.id,
              trackType: 'music',
              audioUrl: music.audioUrl,
              durationMs: music.durationMs,
              metadata: {
                trackId: track.track_id,
                prompt: track.prompt,
                mood: track.mood,
                loop: track.loop,
              },
            });
          } catch {
            // Music is non-critical
          }
        }

        completed.push('audio');

        await updateProgress('finishing', 93, completed);

        // ── Step 8: YouTube Metadata + Thumbnail (non-critical) ──
        try {
          const ytResult = await generateYouTubeMetadata(
            screenplay,
            episode.title,
            plan.series.title,
            p.language,
          );
          const ytData = ytResult.data as unknown as Record<string, unknown>;
          await ctx.db
            .update(episodes)
            .set({ youtubeMetadata: ytData })
            .where(eq(episodes.id, episode.id));

          // Generate thumbnail from metadata prompt
          const thumbPrompt = (ytData as { thumbnail_prompt?: string }).thumbnail_prompt;
          if (thumbPrompt) {
            try {
              const thumbUrl = await generateThumbnail({ prompt: thumbPrompt, style: p.style });
              await ctx.db
                .update(episodes)
                .set({ thumbnailUrl: thumbUrl })
                .where(eq(episodes.id, episode.id));
            } catch {
              console.warn('[V2] Thumbnail generation failed, continuing...');
            }
          }
        } catch {
          console.warn('[V2] YouTube metadata generation failed, continuing...');
        }

        await updateProgress('finishing', 98, completed);

        // ── Step 9: Mark Ready ──
        await ctx.db
          .update(episodes)
          .set({
            status: 'ready',
            generationCompletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, episode.id));

        completed.push('complete');
        await updateProgress('complete', 100, completed);
        await ctx.db
          .update(generationJobs)
          .set({ completedAt: new Date() })
          .where(eq(generationJobs.id, jobId));

        // Increment monthly usage
        await ctx.db
          .update(appProfiles)
          .set({
            episodesUsedThisMonth: ctx.profile.episodesUsedThisMonth + 1,
            updatedAt: new Date(),
          })
          .where(eq(appProfiles.id, ctx.profile.id));

        return { success: true, episodeId: episode.id };
      } catch (error) {
        await ctx.db
          .update(episodes)
          .set({
            status: 'failed',
            generationError:
              error instanceof Error ? error.message : 'Generation failed',
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, episode.id));

        await ctx.db
          .update(generationJobs)
          .set({
            error:
              error instanceof Error ? error.message : 'Generation failed',
            completedAt: new Date(),
          })
          .where(eq(generationJobs.id, jobId));

        throw error;
      }
    }),

  togglePublic: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        episodeId: z.string().uuid(),
        isPublic: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      if (!project[0] || project[0].userId !== ctx.user.id) {
        throw new Error('Project not found');
      }

      const slug = input.isPublic
        ? input.episodeId.slice(0, 8) + '-' + Date.now().toString(36)
        : null;

      await ctx.db
        .update(episodes)
        .set({
          isPublic: input.isPublic,
          publicSlug: slug,
          updatedAt: new Date(),
        })
        .where(eq(episodes.id, input.episodeId));

      return {
        success: true,
        isPublic: input.isPublic,
        publicSlug: slug,
        shareUrl: input.isPublic
          ? `/watch/${input.episodeId}`
          : null,
      };
    }),
});
