/**
 * Seed script: generates a demo episode for the landing page.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.seed.json scripts/seed-demo-episode.ts
 *
 * Requires all API keys in .env.local (loaded via dotenv).
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../src/server/db/schema';

// ---------- DB ----------
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });
const {
  projects,
  episodes,
  characters,
  panels,
  audioTracks,
  generationJobs,
  appProfiles,
} = schema;

// ---------- AI services ----------
import {
  analyzeContent,
  planSeries,
  generateScript,
  validateScript,
  generateVisualPrompts,
  generateAudioDirection,
  generateQuiz,
  generateStudyNotes,
  generateFlashcards,
  type ContentAnalysis,
  type SeriesPlan,
  type EpisodeScript,
  type AudioDirection,
} from '../src/server/services/ai-pipeline';
import {
  generateCharacterSheet,
  generateImage,
  getStyleModifiers,
  generateVideoFromStill,
} from '../src/server/services/fal';
import {
  generateSpeech,
  generateSoundEffect,
  generateMusic,
} from '../src/server/services/elevenlabs';

// ---------- Config ----------
const USER_ID = 'rkCxJ18PtWJShVoEHVMfwKFsMGRdigwu'; // Test User
const STYLE = 'clean_modern';
const LANGUAGE = 'en';
const TARGET_DURATION = 3; // minutes

// ============================================================
// ANIME-OPTIMIZED VOICE MAP
// Expressive voices that sound great for anime-style delivery
// ============================================================
const ANIME_VOICE_MAP: Record<string, { voiceId: string; style: number; stability: number; similarityBoost: number }> = {
  // Charlie — energetic young male, perfect for shonen protagonist
  protagonist_male:   { voiceId: 'IKne3meq5aSn9XLyUdCD', style: 0.7, stability: 0.35, similarityBoost: 0.8 },
  protagonist:        { voiceId: 'IKne3meq5aSn9XLyUdCD', style: 0.7, stability: 0.35, similarityBoost: 0.8 },
  // Jessica — playful, bright, warm, perfect for female protagonist
  protagonist_female: { voiceId: 'cgSgspJ2msm6clMCkdW9', style: 0.65, stability: 0.4, similarityBoost: 0.8 },
  // George — warm storyteller, perfect for wise mentor/sensei
  mentor:             { voiceId: 'JBFqnCBsd6RMkjVDRZzb', style: 0.5, stability: 0.55, similarityBoost: 0.85 },
  sensei:             { voiceId: 'JBFqnCBsd6RMkjVDRZzb', style: 0.5, stability: 0.55, similarityBoost: 0.85 },
  // Harry — fierce warrior, rough voice, perfect for rival
  rival:              { voiceId: 'SOYHLrjzK2X1ezoPC6cr', style: 0.75, stability: 0.3, similarityBoost: 0.75 },
  antagonist:         { voiceId: 'SOYHLrjzK2X1ezoPC6cr', style: 0.75, stability: 0.3, similarityBoost: 0.75 },
  // Callum — husky trickster, great for comic relief/sidekick
  comic_relief:       { voiceId: 'N2lVS1w4EtoT3dr4eOWO', style: 0.7, stability: 0.35, similarityBoost: 0.75 },
  sidekick:           { voiceId: 'N2lVS1w4EtoT3dr4eOWO', style: 0.7, stability: 0.35, similarityBoost: 0.75 },
  // George — warm storyteller for narration (slightly different settings)
  narrator:           { voiceId: 'JBFqnCBsd6RMkjVDRZzb', style: 0.35, stability: 0.6, similarityBoost: 0.85 },
  // Laura — enthusiast, quirky, great for supporting female roles
  support_female:     { voiceId: 'FGY2WhTYpPnrIDTdsKH5', style: 0.6, stability: 0.4, similarityBoost: 0.8 },
  // Liam — energetic, great for secondary male roles
  support_male:       { voiceId: 'TX3LPaxmHKxFdv7VOQHJ', style: 0.6, stability: 0.4, similarityBoost: 0.8 },
};

function getAnimeVoice(role: string) {
  const lower = role.toLowerCase();
  return ANIME_VOICE_MAP[lower]
    ?? ANIME_VOICE_MAP.protagonist_male; // fallback
}

// Short educational content about photosynthesis (clear, visual topic)
const RAW_CONTENT = `
Photosynthesis: How Plants Make Their Own Food

Photosynthesis is one of the most important biological processes on Earth. It is the process by which green plants, algae, and some bacteria convert light energy from the sun into chemical energy stored in glucose. This process is fundamental to life on Earth because it produces the oxygen we breathe and forms the base of most food chains.

The Chemical Equation
The overall equation for photosynthesis is:
6CO2 + 6H2O + light energy → C6H12O6 + 6O2

In words: six molecules of carbon dioxide plus six molecules of water, using light energy, produce one molecule of glucose and six molecules of oxygen.

Where Photosynthesis Happens
Photosynthesis takes place primarily in the leaves of plants. The key organelle responsible is the chloroplast, which contains a green pigment called chlorophyll. Chlorophyll is what gives plants their green color and is essential for absorbing light energy.

The leaf structure is specially adapted for photosynthesis:
- The upper epidermis is transparent to allow light through
- Palisade mesophyll cells contain the most chloroplasts and are arranged vertically for maximum light absorption
- Spongy mesophyll has air spaces for gas exchange
- Stomata (tiny pores on the underside of leaves) allow CO2 in and O2 out
- Vascular bundles (veins) transport water to the leaf and sugars away

The Two Stages of Photosynthesis

Stage 1: Light-Dependent Reactions (in the thylakoid membranes)
These reactions require light and occur in the thylakoid membranes of chloroplasts.
1. Light energy is absorbed by chlorophyll
2. Water molecules are split (photolysis): 2H2O → 4H+ + 4e- + O2
3. The oxygen is released as a waste product
4. The energy is used to create ATP (adenosine triphosphate) and NADPH
5. These energy carriers (ATP and NADPH) move to stage 2

Stage 2: Light-Independent Reactions — The Calvin Cycle (in the stroma)
These reactions do not directly require light and occur in the stroma of chloroplasts.
1. CO2 from the atmosphere enters the leaf through stomata
2. CO2 is fixed by the enzyme RuBisCO, combining with a 5-carbon molecule (RuBP)
3. This creates an unstable 6-carbon compound that splits into two 3-carbon molecules (G3P)
4. ATP and NADPH from stage 1 provide the energy to convert G3P into glucose
5. RuBP is regenerated to continue the cycle

Factors Affecting Photosynthesis
Several environmental factors influence the rate of photosynthesis:
- Light intensity: As light increases, the rate of photosynthesis increases until a plateau is reached
- Carbon dioxide concentration: Higher CO2 levels generally increase the rate
- Temperature: Photosynthesis has an optimal temperature range (typically 25-35°C for most plants); too hot denatures enzymes
- Water availability: Water stress closes stomata, reducing CO2 intake

The Importance of Photosynthesis
1. Oxygen Production: Virtually all atmospheric oxygen comes from photosynthesis
2. Food Production: Plants produce glucose which is the starting point for all organic molecules
3. Carbon Fixation: Plants remove CO2 from the atmosphere, helping regulate Earth's climate
4. Energy Flow: Solar energy is converted to chemical energy that flows through ecosystems
5. Fossil Fuels: Coal, oil, and natural gas are the remains of ancient photosynthetic organisms

Photosynthesis vs Cellular Respiration
While photosynthesis stores energy, cellular respiration releases it. They are essentially reverse processes:
- Photosynthesis: CO2 + H2O + light → glucose + O2 (stores energy)
- Respiration: glucose + O2 → CO2 + H2O + ATP (releases energy)
Together, these two processes form a cycle that sustains life on Earth.
`.trim();

// ---------- Main ----------
async function main() {
  console.log('=== AnimeLearn Demo Episode Seed (v2 — Anime Voices + Video) ===\n');

  // Ensure app_profile exists for user
  const existingProfile = await db
    .select()
    .from(appProfiles)
    .where(eq(appProfiles.authUserId, USER_ID))
    .limit(1);

  let profileId: string;
  if (existingProfile.length === 0) {
    const [p] = await db
      .insert(appProfiles)
      .values({ authUserId: USER_ID, tier: 'pro' })
      .returning();
    profileId = p.id;
    console.log('Created app_profile:', profileId);
  } else {
    profileId = existingProfile[0].id;
    await db
      .update(appProfiles)
      .set({ tier: 'pro' })
      .where(eq(appProfiles.id, profileId));
    console.log('Using existing app_profile:', profileId);
  }

  // Create project
  const [project] = await db
    .insert(projects)
    .values({
      userId: USER_ID,
      title: 'Photosynthesis: How Plants Make Food',
      sourceType: 'pdf',
      rawContent: RAW_CONTENT,
      style: STYLE,
      language: LANGUAGE,
      targetDurationMinutes: TARGET_DURATION,
      status: 'draft',
    })
    .returning();

  console.log('Created project:', project.id);

  // ── Phase 1: Content Analysis ──
  console.log('\n[1/8] Analyzing content...');
  const t1 = Date.now();
  const analysisResult = await analyzeContent(RAW_CONTENT, 'pdf', LANGUAGE);
  console.log(
    `  Done (${((Date.now() - t1) / 1000).toFixed(1)}s) — ${analysisResult.data.metadata.total_concepts} concepts found`,
  );

  await db
    .update(projects)
    .set({ contentAnalysis: analysisResult.data, status: 'analyzing' })
    .where(eq(projects.id, project.id));

  const analysis = analysisResult.data as ContentAnalysis;

  // ── Phase 2: Series Planning ──
  console.log('[2/8] Planning series...');
  const t2 = Date.now();
  const planResult = await planSeries(analysis, STYLE, LANGUAGE);
  console.log(
    `  Done (${((Date.now() - t2) / 1000).toFixed(1)}s) — "${planResult.data.series.title}", ${planResult.data.characters.length} characters, ${planResult.data.episodes.length} episodes`,
  );

  // Save characters with anime voice IDs
  for (const char of planResult.data.characters) {
    const animeVoice = getAnimeVoice(char.role);
    await db.insert(characters).values({
      projectId: project.id,
      name: char.name,
      role: char.role,
      visualDescription: char.visual_description,
      personality: char as unknown as Record<string, unknown>,
      voiceId: animeVoice.voiceId,
    });
  }

  const epPlan = planResult.data.episodes[0];
  const [episode] = await db
    .insert(episodes)
    .values({
      projectId: project.id,
      episodeNumber: 1,
      title: epPlan.title,
      synopsis: epPlan.synopsis,
      status: 'planned',
    })
    .returning();

  await db
    .update(projects)
    .set({
      seriesPlan: planResult.data,
      totalEpisodes: planResult.data.series.total_episodes,
      status: 'planned',
    })
    .where(eq(projects.id, project.id));

  const plan = planResult.data as SeriesPlan;

  // Create generation job
  const [job] = await db
    .insert(generationJobs)
    .values({
      episodeId: episode.id,
      currentStep: 'script',
      progress: 0,
      stepsCompleted: [],
    })
    .returning();

  await db
    .update(episodes)
    .set({ status: 'script', generationStartedAt: new Date() })
    .where(eq(episodes.id, episode.id));

  // ── Phase 3: Script Generation ──
  console.log('[3/8] Generating script (Opus)...');
  const t3 = Date.now();
  const scriptResult = await generateScript(analysis, plan, 1, LANGUAGE, TARGET_DURATION, []);
  console.log(`  Done (${((Date.now() - t3) / 1000).toFixed(1)}s)`);

  const validation = await validateScript(scriptResult.data, plan, analysis, 1);
  console.log(`  Validation: ${validation.data.is_valid ? 'PASSED' : 'needs revision'}`);

  await db
    .update(episodes)
    .set({
      script: scriptResult.data as unknown as Record<string, unknown>,
      status: 'visuals',
    })
    .where(eq(episodes.id, episode.id));

  const script = scriptResult.data as EpisodeScript;
  const totalPanels = script.scenes.reduce((sum, s) => sum + s.panels.length, 0);
  console.log(`  ${script.scenes.length} scenes, ${totalPanels} panels`);

  // ── Phase 4: Character Sheets ──
  console.log('[4/8] Generating character sheets...');
  const t4 = Date.now();
  const chars = await db
    .select()
    .from(characters)
    .where(eq(characters.projectId, project.id));

  for (const char of chars) {
    const sheet = await generateCharacterSheet(char.visualDescription, STYLE);
    await db
      .update(characters)
      .set({ characterSheetUrl: sheet.url })
      .where(eq(characters.id, char.id));
    console.log(`  ${char.name}: done`);
  }
  console.log(`  Done (${((Date.now() - t4) / 1000).toFixed(1)}s)`);

  // ── Phase 5: Visual Prompts ──
  console.log('[5/8] Generating visual prompts...');
  const t5 = Date.now();
  const vpResult = await generateVisualPrompts(script, plan, STYLE);
  await db
    .update(episodes)
    .set({ visualPrompts: vpResult.data as unknown as Record<string, unknown> })
    .where(eq(episodes.id, episode.id));
  console.log(`  Done (${((Date.now() - t5) / 1000).toFixed(1)}s) — ${vpResult.data.panels.length} panels`);

  // ── Phase 6: Images + Video Clips (fal.ai) ──
  console.log('[6/8] Generating images + animated video clips (fal.ai Wan-2.1)...');
  const t6 = Date.now();
  const styleMod = getStyleModifiers(STYLE);

  for (let i = 0; i < vpResult.data.panels.length; i++) {
    const vp = vpResult.data.panels[i];
    console.log(`  Panel ${i + 1}/${vpResult.data.panels.length}: ${vp.panel_id}`);

    let panelOrder = 0;
    let sceneId = 's01';
    let scriptPanel: (typeof script.scenes)[number]['panels'][number] | undefined;

    for (const scene of script.scenes) {
      const idx = scene.panels.findIndex((sp) => sp.panel_id === vp.panel_id);
      if (idx >= 0) {
        scriptPanel = scene.panels[idx];
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
    console.log(`    Still image: done`);

    // Animate the still image into a video clip using fal.ai Wan-2.1
    let videoUrl: string | null = null;
    try {
      const motionPrompt = scriptPanel?.parallax?.background_movement ?? 'gentle camera motion';
      const videoResult = await generateVideoFromStill({
        prompt: `${motionPrompt}, ${vp.layers.background.prompt}, anime style, cinematic anime, smooth motion, high quality animation`,
        imageUrl: referenceImage.url,
        duration: 5,
      });
      videoUrl = videoResult.videoUrl;
      console.log(`    Video clip: done`);
    } catch (err) {
      console.warn(`    Video clip failed (using still image):`, err instanceof Error ? err.message : err);
    }

    await db.insert(panels).values({
      episodeId: episode.id,
      sceneId,
      panelId: vp.panel_id,
      panelOrder: panelOrder >= 0 ? panelOrder : 0,
      backgroundImageUrl: referenceImage.url,
      videoUrl,
      prompt: vp as unknown as Record<string, unknown>,
      metadata: { durationSeconds: 6 },
    });
  }
  console.log(`  Done (${((Date.now() - t6) / 1000).toFixed(1)}s)`);

  // ── Phase 7: Audio Direction + TTS + Music + SFX ──
  console.log('[7/8] Generating audio (anime voices)...');
  const t7 = Date.now();
  const adResult = await generateAudioDirection(script, plan, 1, LANGUAGE);
  await db
    .update(episodes)
    .set({
      audioDirection: adResult.data as unknown as Record<string, unknown>,
      status: 'audio',
    })
    .where(eq(episodes.id, episode.id));

  const direction = adResult.data as AudioDirection;

  // Build voice map: character_id → anime voice config
  const updatedChars = await db
    .select()
    .from(characters)
    .where(eq(characters.projectId, project.id));

  const charVoiceMap = new Map<string, { voiceId: string; style: number; stability: number; similarityBoost: number }>();
  for (const char of updatedChars) {
    const personality = char.personality as Record<string, unknown> | null;
    const charId = (personality?.id as string) ?? char.id;
    const animeVoice = getAnimeVoice(char.role);
    // Use stored voiceId if available, otherwise use anime map
    if (char.voiceId) {
      charVoiceMap.set(charId, { ...animeVoice, voiceId: char.voiceId });
    } else {
      charVoiceMap.set(charId, animeVoice);
    }
    console.log(`  Voice: ${char.name} (${char.role}) → ${animeVoice.voiceId}`);
  }

  // Dialogue + Narration + SFX
  let audioCount = 0;
  for (const entry of direction.audio_timeline) {
    for (const line of entry.dialogue) {
      if (!line.text) continue;
      const voice = charVoiceMap.get(line.character_id);
      if (!voice) continue;

      const tts = await generateSpeech({
        text: line.text,
        voiceId: voice.voiceId,
        stability: line.emotion_override?.stability ?? voice.stability,
        similarityBoost: voice.similarityBoost,
        style: voice.style,
        speed: line.emotion_override?.speed ?? 1.0,
      });

      const audioUrl = 'data:audio/mp3;base64,' + tts.audioBuffer.toString('base64');

      await db.insert(audioTracks).values({
        episodeId: episode.id,
        trackType: 'dialogue',
        characterId: updatedChars.find((c) => {
          const pers = c.personality as Record<string, unknown> | null;
          return (pers?.id as string) === line.character_id;
        })?.id,
        audioUrl,
        durationMs: tts.durationMs,
        panelId: entry.panel_id,
        metadata: { text: line.text, characterId: line.character_id, emotion: line.emotion_override },
      });
      audioCount++;
    }

    if (entry.narration?.text) {
      const narratorVoice = getAnimeVoice('narrator');
      const tts = await generateSpeech({
        text: entry.narration.text,
        voiceId: narratorVoice.voiceId,
        stability: narratorVoice.stability,
        similarityBoost: narratorVoice.similarityBoost,
        style: narratorVoice.style,
        speed: entry.narration.speed ?? 0.95,
      });
      const audioUrl = 'data:audio/mp3;base64,' + tts.audioBuffer.toString('base64');

      await db.insert(audioTracks).values({
        episodeId: episode.id,
        trackType: 'narration',
        audioUrl,
        durationMs: tts.durationMs,
        panelId: entry.panel_id,
        metadata: { text: entry.narration.text },
      });
      audioCount++;
    }

    if (entry.sfx?.description) {
      try {
        const sfx = await generateSoundEffect(entry.sfx.description, 3);
        const audioUrl = 'data:audio/mp3;base64,' + sfx.audioBuffer.toString('base64');
        await db.insert(audioTracks).values({
          episodeId: episode.id,
          trackType: 'sfx',
          audioUrl,
          durationMs: sfx.durationMs,
          panelId: entry.panel_id,
          metadata: { description: entry.sfx.description, timing: entry.sfx.timing, volume: entry.sfx.volume },
        });
        audioCount++;
      } catch {
        // SFX non-critical
      }
    }
  }

  // Music tracks
  for (const track of direction.music_tracks) {
    try {
      const music = await generateMusic(track.prompt, track.duration_seconds);
      await db.insert(audioTracks).values({
        episodeId: episode.id,
        trackType: 'music',
        audioUrl: music.audioUrl,
        durationMs: music.durationMs,
        metadata: { trackId: track.track_id, prompt: track.prompt, mood: track.mood, loop: track.loop },
      });
      audioCount++;
    } catch {
      // Music non-critical
    }
  }

  console.log(`  Done (${((Date.now() - t7) / 1000).toFixed(1)}s) — ${audioCount} audio tracks`);

  // ── Phase 8: Quiz + Study Notes + Flashcards ──
  console.log('[8/8] Generating quiz + study notes...');
  const t8 = Date.now();
  try {
    const [quizResult, notesResult, flashcardsResult] = await Promise.all([
      generateQuiz(script, analysis, 1, LANGUAGE),
      generateStudyNotes(script, analysis, 1, script.end_card.teaser_next_episode, LANGUAGE),
      generateFlashcards(script, analysis, 1, LANGUAGE),
    ]);

    await db
      .update(episodes)
      .set({
        quizData: quizResult.data as unknown as Record<string, unknown>,
        studyNotes: notesResult.data as unknown as Record<string, unknown>,
        flashcardData: flashcardsResult.data as unknown as Record<string, unknown>,
      })
      .where(eq(episodes.id, episode.id));

    console.log(
      `  Done (${((Date.now() - t8) / 1000).toFixed(1)}s) — ${quizResult.data.questions.length} quiz questions, ${flashcardsResult.data.cards.length} flashcards`,
    );
  } catch (err) {
    console.warn('  Quiz/notes generation failed (non-critical):', err);
  }

  // ── Mark Ready + Public ──
  await db
    .update(episodes)
    .set({
      status: 'ready',
      isPublic: true,
      publicSlug: episode.id.slice(0, 8) + '-demo',
      generationCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(episodes.id, episode.id));

  await db
    .update(generationJobs)
    .set({ currentStep: 'complete', progress: 100, stepsCompleted: ['script', 'characters', 'visual_prompts', 'video_clips', 'audio_direction', 'audio', 'quiz', 'complete'], completedAt: new Date() })
    .where(eq(generationJobs.id, job.id));

  const totalTime = ((Date.now() - t1) / 1000 / 60).toFixed(1);
  console.log(`\n=== DONE in ${totalTime} min ===`);
  console.log(`Episode ID: ${episode.id}`);
  console.log(`Watch URL:  /watch/${episode.id}`);
  console.log(`Public:     YES`);
  console.log('\nUpdate DEMO_EPISODE_ID in src/app/page.tsx with this episode ID.');

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  client.end().then(() => process.exit(1));
});
