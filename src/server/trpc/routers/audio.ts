import { router, protectedProcedure } from '../init';
import { projects, episodes, audioTracks, characters } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  generateAudioDirection,
  type SeriesPlan,
  type EpisodeScript,
  type AudioDirection,
} from '@/server/services/ai-pipeline';
import {
  generateSpeech,
  generateSoundEffect,
  getVoiceForRole,
} from '@/server/services/elevenlabs';
import { generateMusic } from '@/server/services/fal';

export const audioRouter = router({
  // Generate audio direction (AI phase)
  generateDirection: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        episodeId: z.string().uuid(),
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

      const episode = await ctx.db
        .select()
        .from(episodes)
        .where(eq(episodes.id, input.episodeId))
        .limit(1);

      const ep = episode[0];
      if (!ep?.script) throw new Error('Script not generated yet');

      const plan = p.seriesPlan as unknown as SeriesPlan;
      const script = ep.script as unknown as EpisodeScript;

      const result = await generateAudioDirection(
        script,
        plan,
        ep.episodeNumber,
        p.language,
      );

      await ctx.db
        .update(episodes)
        .set({
          audioDirection: result.data as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(episodes.id, input.episodeId));

      return {
        success: true,
        trackCount: result.data.music_tracks.length,
        timelineEntries: result.data.audio_timeline.length,
      };
    }),

  // Generate all audio assets for an episode
  generateAudio: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        episodeId: z.string().uuid(),
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

      const episode = await ctx.db
        .select()
        .from(episodes)
        .where(eq(episodes.id, input.episodeId))
        .limit(1);

      const ep = episode[0];
      if (!ep?.audioDirection) throw new Error('Audio direction not generated');

      const direction = ep.audioDirection as unknown as AudioDirection;

      // Get character voice mappings
      const chars = await ctx.db
        .select()
        .from(characters)
        .where(eq(characters.projectId, input.projectId));

      const charVoiceMap = new Map<string, string>();
      for (const char of chars) {
        const personality = char.personality as Record<string, unknown> | null;
        const charId = (personality?.id as string) ?? char.id;
        const voiceId = char.voiceId ?? getVoiceForRole(char.role);
        charVoiceMap.set(charId, voiceId);
      }

      await ctx.db
        .update(episodes)
        .set({ status: 'audio', updatedAt: new Date() })
        .where(eq(episodes.id, input.episodeId));

      const generatedTracks: string[] = [];

      try {
        // 1. Generate dialogue TTS for each panel
        for (const entry of direction.audio_timeline) {
          // Dialogue lines
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
                line.emotion_override?.stability ?? voiceSettings?.stability ?? 0.5,
              similarityBoost: voiceSettings?.similarity_boost ?? 0.75,
              style: voiceSettings?.style ?? 0.3,
              speed: line.emotion_override?.speed ?? 1.0,
            });

            // Store as base64 data URL for now (S3 later)
            const audioUrl = `data:audio/mp3;base64,${tts.audioBuffer.toString('base64')}`;

            await ctx.db.insert(audioTracks).values({
              episodeId: input.episodeId,
              trackType: 'dialogue',
              characterId: chars.find((c) => {
                const personality = c.personality as Record<string, unknown> | null;
                return (personality?.id as string) === line.character_id;
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

            generatedTracks.push(`dialogue:${entry.panel_id}:${line.character_id}`);
          }

          // Narration
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

            const audioUrl = `data:audio/mp3;base64,${tts.audioBuffer.toString('base64')}`;

            await ctx.db.insert(audioTracks).values({
              episodeId: input.episodeId,
              trackType: 'narration',
              audioUrl,
              durationMs: tts.durationMs,
              panelId: entry.panel_id,
              metadata: { text: entry.narration.text },
            });

            generatedTracks.push(`narration:${entry.panel_id}`);
          }

          // SFX
          if (entry.sfx?.description) {
            try {
              const sfx = await generateSoundEffect(entry.sfx.description, 3);
              const audioUrl = `data:audio/mp3;base64,${sfx.audioBuffer.toString('base64')}`;

              await ctx.db.insert(audioTracks).values({
                episodeId: input.episodeId,
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

              generatedTracks.push(`sfx:${entry.panel_id}`);
            } catch {
              // SFX generation is non-critical, skip on failure
              console.warn(`SFX generation failed for ${entry.panel_id}`);
            }
          }
        }

        // 2. Generate background music tracks
        for (const track of direction.music_tracks) {
          try {
            const music = await generateMusic(
              track.prompt,
              track.duration_seconds,
            );

            await ctx.db.insert(audioTracks).values({
              episodeId: input.episodeId,
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

            generatedTracks.push(`music:${track.track_id}`);
          } catch {
            console.warn(`Music generation failed for ${track.track_id}`);
          }
        }

        // Update episode status
        await ctx.db
          .update(episodes)
          .set({ status: 'composing', updatedAt: new Date() })
          .where(eq(episodes.id, input.episodeId));

        return { success: true, tracksGenerated: generatedTracks.length, tracks: generatedTracks };
      } catch (error) {
        await ctx.db
          .update(episodes)
          .set({
            status: 'failed',
            generationError:
              error instanceof Error ? error.message : 'Audio generation failed',
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, input.episodeId));
        throw error;
      }
    }),

  // List audio tracks for an episode
  listTracks: protectedProcedure
    .input(z.object({ episodeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(audioTracks)
        .where(eq(audioTracks.episodeId, input.episodeId))
        .orderBy(audioTracks.panelId);
    }),
});
