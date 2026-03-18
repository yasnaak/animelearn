import { callClaude } from './claude';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface ContentAnalysis {
  metadata: {
    title: string;
    genre: string;
    tone: string;
    target_audience: string;
    estimated_duration_minutes: number;
    language: string;
  };
  story_elements: Array<{
    id: string;
    name: string;
    type: 'theme' | 'plot_point' | 'character_seed' | 'visual_opportunity' | 'conflict';
    description: string;
    dramatic_potential: number;
  }>;
  suggested_episode_count: number;
  narrative_opportunities: string[];
  visual_set_pieces: string[];
}

export interface SeriesPlan {
  series: {
    title: string;
    tagline: string;
    total_episodes: number;
    tone: 'shonen' | 'seinen' | 'slice_of_life' | 'mystery' | 'horror' | 'comedy' | 'sci_fi' | 'fantasy';
    setting: string;
  };
  characters: Array<{
    id: string;
    name: string;
    role: 'protagonist' | 'mentor' | 'rival' | 'comic_relief' | 'antagonist';
    personality_traits: string[];
    visual_description: string;
    voice_type: string;
    narrative_function: string;
    catchphrase?: string;
  }>;
  episodes: Array<{
    episode_number: number;
    title: string;
    archetype: 'hook' | 'escalation' | 'twist' | 'climax' | 'resolution';
    story_beats: string[];
    synopsis: string;
    opening_hook: string;
    climax: string;
    cliffhanger: string | null;
    emotional_arc: string;
    estimated_shots: number;
  }>;
}

export interface EpisodeScript {
  episode: {
    number: number;
    title: string;
    duration_estimate_seconds: number;
  };
  scenes: Array<{
    scene_id: string;
    scene_type: 'opening' | 'development' | 'climax' | 'resolution' | 'cliffhanger';
    mood: string;
    panels: Array<{
      panel_id: string;
      layout: string;
      visual_description: string;
      background: {
        description: string;
        time_of_day: string;
        weather: string;
      };
      characters_in_panel: Array<{
        character_id: string;
        position: string;
        expression: string;
        pose: string;
        facing: string;
      }>;
      dialogue: Array<{
        character_id: string;
        text: string;
        tone: string;
      }>;
      narration: string | null;
      sfx: string | null;
      music_direction: string | null;
      parallax: {
        background_movement: string;
        character_movement: string;
        effect_layer: string | null;
      };
    }>;
    transition_to_next: string;
  }>;
  end_card: {
    call_to_action: string[];
    teaser_next_episode: string | null;
  };
}

// ============================================================
// SHOT-BASED SCREENPLAY TYPES (v2 — cinematic anime production)
// ============================================================

export interface ScreenplayShot {
  shot_id: string;
  shot_type:
    | 'establishing'
    | 'wide'
    | 'medium'
    | 'close_up'
    | 'extreme_close_up'
    | 'over_shoulder'
    | 'pov'
    | 'insert'
    | 'low_angle'
    | 'high_angle'
    | 'dutch_angle';
  framing: string;
  duration_seconds: 3 | 4 | 5;
  subject: {
    character_ids: string[];
    expressions: string[];
    poses: string[];
    actions: string[];
  };
  camera: {
    movement:
      | 'static'
      | 'slow_push_in'
      | 'slow_pull_out'
      | 'pan_left'
      | 'pan_right'
      | 'tilt_up'
      | 'tilt_down'
      | 'tracking'
      | 'crane_up'
      | 'crane_down'
      | 'handheld_shake';
    focus_target: string;
  };
  visual_direction: string;
  dialogue: Array<{
    character_id: string;
    text: string;
    delivery: string;
  }>;
  narration: string | null;
  sfx_cue: string | null;
  music_cue: 'continue' | 'swell' | 'drop' | 'change' | 'silence' | null;
  transition:
    | 'cut'
    | 'crossfade'
    | 'fade_black'
    | 'fade_white'
    | 'whip_pan'
    | 'match_cut'
    | 'smash_cut'
    | 'dissolve';
  engagement_beat: string | null;
}

export interface ScreenplayBeat {
  beat_type:
    | 'action'
    | 'dialogue'
    | 'reaction'
    | 'revelation'
    | 'silence'
    | 'montage';
  shots: ScreenplayShot[];
}

export interface ScreenplayScene {
  scene_id: string;
  location_id: string;
  time_of_day:
    | 'dawn'
    | 'morning'
    | 'afternoon'
    | 'sunset'
    | 'night'
    | 'midnight';
  weather: string;
  mood: string;
  lighting_notes: string;
  characters_present: string[];
  narrative_function: string;
  beats: ScreenplayBeat[];
  transition_out:
    | 'cut'
    | 'fade_black'
    | 'fade_white'
    | 'dissolve'
    | 'whip_pan'
    | 'match_cut'
    | 'smash_cut';
}

export interface ScreenplayAct {
  act_number: 1 | 2 | 3;
  act_title: string;
  scenes: ScreenplayScene[];
}

export interface Screenplay {
  episode: {
    number: number;
    title: string;
    cold_open: string | null;
    target_duration_seconds: number;
  };
  acts: ScreenplayAct[];
  locations: Array<{
    location_id: string;
    name: string;
    description: string;
    key_features: string[];
    color_palette: string[];
    reference_prompt: string;
  }>;
  end_card: {
    call_to_action: string[];
    teaser_next_episode: string | null;
  };
}

// ============================================================
// PHASE 1: CONTENT ANALYSIS
// ============================================================

const ANALYSIS_SYSTEM_PROMPT = `You are an expert anime narrative analyst. Your job is to analyze source material and extract story elements, dramatic potential, and visual opportunities for anime adaptation.

RULES:
- Identify key themes, plot points, and character seeds
- Rate dramatic potential of each element (1-5)
- Identify visual set-pieces — moments that would look stunning as anime
- Suggest genre and tone for the anime adaptation
- Estimate how many episodes the material warrants
- Look for conflicts, twists, and emotional hooks

OUTPUT: Respond EXCLUSIVELY with valid JSON, no additional text or code blocks.`;

const ANALYSIS_SCHEMA = `{
  "metadata": {
    "title": "string",
    "genre": "string",
    "tone": "string",
    "target_audience": "string",
    "estimated_duration_minutes": number,
    "language": "string"
  },
  "story_elements": [
    {
      "id": "element_001",
      "name": "string",
      "type": "theme | plot_point | character_seed | visual_opportunity | conflict",
      "description": "string (1-2 sentences)",
      "dramatic_potential": number 1-5
    }
  ],
  "suggested_episode_count": number,
  "narrative_opportunities": ["string"],
  "visual_set_pieces": ["string"]
}`;

export async function analyzeContent(
  rawContent: string,
  sourceType: 'pdf' | 'youtube' | 'text' | 'idea' | 'url',
  language: string,
) {
  // For 'idea' sourceType, use a different prompt that generates story elements from a brief idea
  if (sourceType === 'idea') {
    return callClaude<ContentAnalysis>({
      model: 'sonnet',
      systemPrompt: ANALYSIS_SYSTEM_PROMPT,
      userPrompt: `Analyze the following story idea and produce a JSON analysis following this schema:\n\n${ANALYSIS_SCHEMA}\n\nContent language: ${language}\n\nThe user has provided a brief idea or concept. Expand it into story elements, identify dramatic potential, and suggest visual set-pieces for an anime adaptation.\n\n---\n\n${rawContent}`,
      maxTokens: 2048,
      temperature: 0.7,
      timeoutMs: 30_000,
    });
  }

  const sourceLabel =
    sourceType === 'pdf'
      ? 'PDF'
      : sourceType === 'youtube'
        ? 'YouTube transcript'
        : sourceType === 'url'
          ? 'web page content'
          : 'text content';

  // Cap content at ~12K chars to keep within Vercel Hobby 60s timeout
  // A YouTube transcript of 10min is typically ~8-12K chars
  const cappedContent =
    rawContent.length > 12000
      ? rawContent.slice(0, 12000) + '\n\n[Content truncated for analysis]'
      : rawContent;

  // Single-pass analysis (no chunking) — must finish within Vercel's 60s
  return callClaude<ContentAnalysis>({
    model: 'sonnet',
    systemPrompt: ANALYSIS_SYSTEM_PROMPT,
    userPrompt: `Analyze the following ${sourceLabel} and produce a JSON analysis following this schema:\n\n${ANALYSIS_SCHEMA}\n\nContent language: ${language}\n\n---\n\n${cappedContent}`,
    maxTokens: 2048,
    temperature: 0.5,
    timeoutMs: 30_000,
  });
}

// ============================================================
// PHASE 2: SERIES PLANNING
// ============================================================

const PLANNING_SYSTEM_PROMPT = `You are a professional anime showrunner. You create binge-worthy anime series optimized for YouTube audiences.

PRINCIPLES:
1. Each episode must be self-contained but leave viewers wanting more
2. Target 3-5 minutes per episode
3. End each episode with a hook — cliffhanger, question, or tease

CONSTRAINTS:
- Maximum 3 episodes per series (to keep output concise)
- Maximum 3-4 characters total
- Keep visual_description to 1-2 sentences
- Keep synopsis to 1-2 sentences
- Keep story_beats to 3-5 items per episode

OUTPUT: Respond EXCLUSIVELY with valid JSON. Do NOT wrap in code blocks. Do NOT use \`\`\`json. Just raw JSON.`;

const PLANNING_SCHEMA = `{
  "series": {
    "title": "string (anime-style title)",
    "tagline": "string (one-line hook)",
    "total_episodes": number,
    "tone": "shonen | seinen | slice_of_life | mystery | horror | comedy | sci_fi | fantasy",
    "setting": "string (where the story takes place)"
  },
  "characters": [
    {
      "id": "char_001",
      "name": "string",
      "role": "protagonist | mentor | rival | comic_relief | antagonist",
      "personality_traits": ["string"],
      "visual_description": "string (detailed physical description for image generation)",
      "voice_type": "string",
      "narrative_function": "string",
      "catchphrase": "string (optional)"
    }
  ],
  "episodes": [
    {
      "episode_number": 1,
      "title": "string",
      "archetype": "hook | escalation | twist | climax | resolution",
      "story_beats": ["string"],
      "synopsis": "string (2-3 sentences)",
      "opening_hook": "string",
      "climax": "string",
      "cliffhanger": "string | null",
      "emotional_arc": "string",
      "estimated_shots": number
    }
  ]
}`;

export async function planSeries(
  analysis: ContentAnalysis,
  style: string,
  language: string,
) {
  // Send compact analysis to reduce input tokens and speed up response
  const compactAnalysis = {
    metadata: analysis.metadata,
    story_elements: analysis.story_elements.map(e => ({
      id: e.id, name: e.name, type: e.type,
      description: e.description, dramatic_potential: e.dramatic_potential,
    })),
    suggested_episode_count: analysis.suggested_episode_count,
  };

  return callClaude<SeriesPlan>({
    model: 'sonnet',
    systemPrompt: PLANNING_SYSTEM_PROMPT,
    userPrompt: `Based on this content analysis, plan an anime series.\n\nVisual style: ${style}\nLanguage for dialogue: ${language}\n\nFollow this JSON schema:\n${PLANNING_SCHEMA}\n\nContent Analysis:\n${JSON.stringify(compactAnalysis)}`,
    maxTokens: 4096,
    temperature: 0.7,
    timeoutMs: 30_000,
  });
}

// ============================================================
// PHASE 3: SCRIPT GENERATION
// ============================================================

const SCRIPT_SYSTEM_PROMPT = `You are an award-winning anime screenwriter. You write scripts that audiences remember years later. Your superpower: creating emotionally compelling stories with stunning visual moments.

SCRIPT RULES:
1. SHOW, DON'T TELL — let characters reveal themselves through action and conflict, not exposition
2. Each panel has max 2 dialogue lines (15 words per line max). Silence is powerful. Use panels without dialogue for impact moments.
3. Information is conveyed by: dialogue (30%), visuals (50%), context/subtext (20%)
4. Every scene needs CONFLICT — external or internal (doubt, fear, rivalry, moral dilemma)
5. Alternate rhythm: action/dialogue/silence/action — never 3 consecutive panels of the same type
6. Create memorable moments: dramatic reveals, emotional confrontations, visual spectacles
7. End with a hook that makes the viewer click "next episode"

CONTINUITY:
If you receive previous episode context:
- The opening_hook MUST connect with the previous episode's cliffhanger/teaser
- Maintain character personality and emotional state consistency
- Reference events from previous episodes when natural
- Build on established relationships and conflicts

OUTPUT: Respond EXCLUSIVELY with valid JSON, no additional text or code blocks.`;

const SCRIPT_SCHEMA = `{
  "episode": {
    "number": number,
    "title": "string",
    "duration_estimate_seconds": number
  },
  "scenes": [
    {
      "scene_id": "s01",
      "scene_type": "opening | development | climax | resolution | cliffhanger",
      "mood": "tense | hopeful | mysterious | energetic | calm | dramatic | comedic",
      "panels": [
        {
          "panel_id": "s01_p01",
          "layout": "full_page | half_page | third_page | widescreen | closeup",
          "visual_description": "string",
          "background": {
            "description": "string",
            "time_of_day": "dawn | morning | afternoon | evening | night",
            "weather": "clear | cloudy | rain | snow | none_indoor"
          },
          "characters_in_panel": [
            {
              "character_id": "char_001",
              "position": "left | center | right | background",
              "expression": "string",
              "pose": "string",
              "facing": "viewer | left | right | away"
            }
          ],
          "dialogue": [
            {
              "character_id": "char_001",
              "text": "string (max 15 words)",
              "tone": "excited | calm | angry | sad | sarcastic | whisper | shout"
            }
          ],
          "narration": "string | null",
          "sfx": "string | null",
          "music_direction": "string | null",
          "parallax": {
            "background_movement": "string",
            "character_movement": "string",
            "effect_layer": "string | null"
          }
        }
      ],
      "transition_to_next": "cut | fade_black | fade_white | swipe_left | zoom_out | dissolve"
    }
  ],
  "end_card": {
    "call_to_action": ["string (3-5 calls to action: subscribe, comment, next episode)"],
    "teaser_next_episode": "string | null"
  }
}`;

export interface PreviousEpisodeContext {
  episodeNumber: number;
  title: string;
  summaryPoints: string[];
  teaserNextEpisode: string | null;
  cliffhanger: string | null;
  storyBeats: string[];
}

export async function generateScript(
  analysis: ContentAnalysis,
  plan: SeriesPlan,
  episodeNumber: number,
  language: string,
  targetDurationMinutes: number = 5,
  previousEpisodes: PreviousEpisodeContext[] = [],
) {
  const episode = plan.episodes.find((e) => e.episode_number === episodeNumber);
  if (!episode) {
    throw new Error(`Episode ${episodeNumber} not found in series plan`);
  }

  const panelGuidance =
    targetDurationMinutes <= 3
      ? '4-6 panels total (short episode, ~3 minutes)'
      : targetDurationMinutes <= 5
        ? '6-10 panels total (standard episode, ~5 minutes)'
        : '10-16 panels total (long episode, ~10 minutes)';

  return callClaude<EpisodeScript>({
    model: 'sonnet',
    systemPrompt: SCRIPT_SYSTEM_PROMPT,
    userPrompt: `Generate a complete panel-by-panel script for episode ${episodeNumber}.

TARGET DURATION: ${targetDurationMinutes} minutes. Use ${panelGuidance}.
Language for all dialogue and narration: ${language}

Follow this JSON schema exactly:
${SCRIPT_SCHEMA}

SERIES INFO:
${JSON.stringify(plan.series, null, 2)}

CHARACTERS:
${JSON.stringify(plan.characters, null, 2)}

EPISODE PLAN:
${JSON.stringify(episode, null, 2)}

STORY ELEMENTS:
${JSON.stringify(
  analysis.story_elements,
  null,
  2,
)}${
  previousEpisodes.length > 0
    ? `

PREVIOUS EPISODES CONTEXT (maintain continuity):
${previousEpisodes
  .map(
    (prev) =>
      `Episode ${prev.episodeNumber} "${prev.title}":
- Key points covered: ${prev.summaryPoints.join('; ')}
- Story beats: ${prev.storyBeats.join(', ')}
- Ended with: ${prev.cliffhanger ?? prev.teaserNextEpisode ?? 'No cliffhanger'}`,
  )
  .join('\n\n')}

IMPORTANT: This is episode ${episodeNumber} of ${plan.series.total_episodes}. Build on what came before — don't repeat it.`
    : ''
}`,
    maxTokens: 16384,
    temperature: 0.8,
  });
}

// ============================================================
// PHASE 3B: SCREENPLAY GENERATION (v2 — cinematic anime production)
// ============================================================

const SCREENPLAY_SYSTEM_PROMPT = `You are a master anime screenwriter and director with deep expertise in cinematic storytelling and narrative design. You create professional-grade anime screenplays that transform source material into compelling, visually stunning stories.

You think in SHOTS — the fundamental unit of anime production. Every shot is a specific camera angle held for 3-5 seconds, exactly like professional anime (Attack on Titan, Demon Slayer, Jujutsu Kaisen).

=== SHOT TYPES AND WHEN TO USE THEM ===

ESTABLISHING SHOT: Wide view of a location. Used at the START of a new scene to orient the viewer. Shows the world, the scale, the atmosphere. Duration: 4-5s.
  Example: "Aerial view of a vast library built into the side of a mountain, sunset light streaming through stained glass windows, clouds drifting below"

WIDE SHOT: Full-body view of characters in their environment. Used for group scenes, action, movement. Duration: 4-5s.
  Example: "Three students stand at the edge of a glowing data stream, their silhouettes contrasted against pulsing blue light"

MEDIUM SHOT: Waist-up. The workhorse shot — most dialogue happens here. Shows body language + facial expressions. Duration: 3-5s.
  Example: "Medium shot of Riko, off-center right, hands gripping a crumbling scroll, eyes wide with realization"

CLOSE-UP: Face/head. Maximum emotional impact. Used for key revelations, intense dialogue, emotional beats. Duration: 3-4s.
  Example: "Close-up of Sensei Takumi's face, one eye shadowed, a knowing smile forming, cherry blossom petals drifting past"

EXTREME CLOSE-UP: Eyes, hands, an object. Used sparingly for maximum dramatic effect. Duration: 3s.
  Example: "Extreme close-up of a single equation being written, ink flowing across paper, each symbol glowing faintly as it's completed"

OVER-THE-SHOULDER: Camera behind one character looking at another. Perfect for dialogue exchanges. Creates depth and intimacy. Duration: 3-4s.
  Example: "Over Riko's shoulder, we see Kai smirking, arms crossed, the training arena stretching behind him"

POV (Point of View): Camera IS the character's eyes. Used for discovery moments, reading, examining. Duration: 3-4s.
  Example: "POV through Riko's eyes: a holographic diagram unfolds, layers of data rotating slowly, key values highlighted in gold"

INSERT: Close shot of an object, diagram, or detail. Perfect for showing important story details visually. Duration: 3-4s.
  Example: "Insert shot of the ancient map, camera slowly panning across interconnected nodes, each labeled with a concept name"

LOW ANGLE: Camera looks UP at subject. Makes characters look powerful, imposing, heroic. Duration: 3-4s.
  Example: "Low angle shot of the mentor standing atop the archive stairs, backlit by a massive glowing crystal, robes flowing"

HIGH ANGLE: Camera looks DOWN. Makes characters look vulnerable, overwhelmed, small. Duration: 3-4s.
  Example: "High angle looking down at Riko surrounded by towering bookshelves, each shelf containing infinite scrolling data"

DUTCH ANGLE: Tilted camera. Creates unease, tension, disorientation. Use sparingly. Duration: 3s.
  Example: "Dutch angle on the corridor as reality distorts, the walls bending impossibly, equations floating in mid-air"

=== CAMERA MOVEMENTS ===

static: No movement. Clean, stable. Default for dialogue close-ups.
slow_push_in: Camera slowly moves toward subject. Builds tension, reveals detail, increases intimacy.
slow_pull_out: Camera moves away. Reveals context, creates distance, shows scale.
pan_left / pan_right: Horizontal sweep. Follows action, reveals environment, transitions between subjects.
tilt_up / tilt_down: Vertical sweep. Reveals height/depth, follows gaze, creates awe or dread.
tracking: Camera follows a moving subject. Dynamic action, chase sequences.
crane_up / crane_down: Dramatic vertical movement. Triumph (up), pressure (down).
handheld_shake: Slight camera shake. Urgency, chaos, emotional intensity. Use sparingly.

=== PACING RULES ===

- Calm/contemplative scenes: 4-5 second shots, fewer cuts per minute (8-10 shots/min)
- Dialogue scenes: 3-4 second shots, medium pacing (10-14 shots/min)
- Tension building: 3-4 second shots with occasional long holds for suspense
- Action/climax: 3 second shots, rapid cutting (14-20 shots/min)
- Emotional peaks: Mix of very short (3s) and lingering (5s) shots for contrast
- TOTAL SHOT COUNT: 3 min = 30-50 shots, 5 min = 50-80 shots, 10 min = 100-160 shots

=== NARRATIVE STORYTELLING — HOOK AND ENGAGE ===

CRITICAL: This is anime for YouTube audiences. Every moment must earn the viewer's attention.

DO:
- Create compelling conflicts that drive every scene
- Use visual spectacle moments — dramatic reveals, transformations, action sequences
- Build characters the audience cares about through their actions and choices
- End each act with a hook — a question, revelation, or cliffhanger
- Pace for YouTube: strong opening shots, pattern interrupts every 8-10 shots

DON'T:
- Characters explaining plot to each other (exposition dumps)
- Narration replacing visual storytelling
- Scenes that don't move the plot or develop characters
- Predictable story beats — surprise the audience

=== DIALOGUE RULES ===

- Maximum 2 SHORT sentences per shot (this is anime, not a podcast)
- Dialogue delivery descriptions are critical for voice acting: "whispered trembling", "shouted with fist raised", "muttered while looking away"
- Silence is powerful — some shots have NO dialogue, only visuals and music
- Story exposition through dialogue must feel natural, never forced

=== VISUAL DIRECTION FORMAT ===

The visual_direction field is the MOST IMPORTANT field. It will be used directly as a prompt for AI image generation. Be EXTREMELY detailed:

GOOD: "Anime medium shot, a young woman with short blue hair and round glasses stands in a vast library, warm golden afternoon light streaming through tall arched windows behind her, dust motes floating in the light beams, she holds an ancient leather-bound book open with both hands, her expression shifting from confusion to wonder, bookshelves towering on both sides creating depth, art style: clean modern anime with soft cel shading, warm color palette dominated by amber and deep blue"

BAD: "Riko in the library looking at a book"

Include in EVERY visual_direction:
1. Art style reference (anime, cel-shaded, specific aesthetic)
2. Shot type and framing explicitly stated
3. Character appearance details (hair, clothes, distinguishing features)
4. Environment details (location, lighting, atmosphere, weather)
5. Character expression and body language
6. Color palette / dominant colors
7. Mood-setting details (particles, effects, atmosphere)

=== LOCATIONS ===

Define all unique locations used in the screenplay. Each location needs:
- A descriptive name
- Detailed physical description (architecture, materials, scale)
- Key visual features that make it unique and recognizable
- Color palette (5-6 hex codes)
- A reference_prompt: an ultra-detailed prompt to generate a reference image of this location (NO characters, just the empty environment)

=== 3-ACT STRUCTURE ===

Act 1 (Setup, ~20% of shots): Introduce world, characters, the central conflict or mystery
Act 2 (Confrontation, ~60% of shots): Characters face obstacles, stakes escalate, relationships deepen. The bulk of the story.
Act 3 (Resolution, ~20% of shots): The climax, emotional payoff, resolution, teaser for next episode.

=== OUTPUT FORMAT ===

Respond EXCLUSIVELY with valid JSON matching the provided schema. No additional text, no code blocks, no commentary.`;

const SCREENPLAY_SCHEMA = `{
  "episode": {
    "number": 1,
    "title": "string",
    "cold_open": "string | null (brief dramatic opening before title card)",
    "target_duration_seconds": 300
  },
  "acts": [
    {
      "act_number": 1,
      "act_title": "string",
      "scenes": [
        {
          "scene_id": "s01",
          "location_id": "loc_library",
          "time_of_day": "dawn | morning | afternoon | sunset | night | midnight",
          "weather": "string",
          "mood": "string (emotional atmosphere)",
          "lighting_notes": "string (specific lighting for this scene)",
          "characters_present": ["char_001", "char_002"],
          "narrative_function": "string (hook | tension_build | reveal | action | emotional_beat)",
          "beats": [
            {
              "beat_type": "action | dialogue | reaction | revelation | silence | montage",
              "shots": [
                {
                  "shot_id": "s01_b01_sh01",
                  "shot_type": "establishing | wide | medium | close_up | extreme_close_up | over_shoulder | pov | insert | low_angle | high_angle | dutch_angle",
                  "framing": "string (specific framing description)",
                  "duration_seconds": 3,
                  "subject": {
                    "character_ids": ["char_001"],
                    "expressions": ["wonder", "concentration"],
                    "poses": ["standing, leaning forward"],
                    "actions": ["reaching toward a floating symbol"]
                  },
                  "camera": {
                    "movement": "static | slow_push_in | slow_pull_out | pan_left | pan_right | tilt_up | tilt_down | tracking | crane_up | crane_down | handheld_shake",
                    "focus_target": "string (what the camera focuses on)"
                  },
                  "visual_direction": "string (ULTRA-DETAILED prompt for AI image generation — minimum 50 words)",
                  "dialogue": [
                    {
                      "character_id": "char_001",
                      "text": "string (max 2 short sentences)",
                      "delivery": "string (how the line is delivered: whispered, shouted, calm, trembling, etc.)"
                    }
                  ],
                  "narration": "string | null",
                  "sfx_cue": "string | null (sound effect description)",
                  "music_cue": "continue | swell | drop | change | silence | null",
                  "transition": "cut | crossfade | fade_black | fade_white | whip_pan | match_cut | smash_cut | dissolve",
                  "engagement_beat": "string | null (retention hook, pattern interrupt, or payoff — what keeps the viewer watching)"
                }
              ]
            }
          ],
          "transition_out": "cut | fade_black | fade_white | dissolve | whip_pan | match_cut | smash_cut"
        }
      ]
    }
  ],
  "locations": [
    {
      "location_id": "loc_library",
      "name": "string",
      "description": "string (detailed physical description)",
      "key_features": ["string (unique visual element)"],
      "color_palette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
      "reference_prompt": "string (ultra-detailed prompt for generating a reference image of this empty location, NO characters)"
    }
  ],
  "end_card": {
    "call_to_action": ["string (3-5 calls to action: subscribe, comment, next episode)"],
    "teaser_next_episode": "string | null"
  }
}`;

export async function generateScreenplay(
  analysis: ContentAnalysis,
  plan: SeriesPlan,
  episodeNumber: number,
  language: string,
  targetDurationMinutes: number = 5,
  previousEpisodes: PreviousEpisodeContext[] = [],
) {
  const episode = plan.episodes.find((e) => e.episode_number === episodeNumber);
  if (!episode) {
    throw new Error(`Episode ${episodeNumber} not found in series plan`);
  }

  const shotGuidance =
    targetDurationMinutes <= 3
      ? '30-50 shots total across all scenes (short episode, ~3 minutes). 3-5 scenes.'
      : targetDurationMinutes <= 5
        ? '50-80 shots total across all scenes (standard episode, ~5 minutes). 5-8 scenes.'
        : '100-160 shots total across all scenes (long episode, ~10 minutes). 8-12 scenes.';

  return callClaude<Screenplay>({
    model: 'sonnet',
    systemPrompt: SCREENPLAY_SYSTEM_PROMPT,
    userPrompt: `Generate a complete cinematic anime screenplay for episode ${episodeNumber}.

TARGET DURATION: ${targetDurationMinutes} minutes. Use ${shotGuidance}
Language for ALL dialogue, narration, and text: ${language}

Follow this JSON schema EXACTLY:
${SCREENPLAY_SCHEMA}

=== SERIES INFO ===
${JSON.stringify(plan.series, null, 2)}

=== CHARACTERS ===
${JSON.stringify(
  plan.characters.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    personality_traits: c.personality_traits,
    visual_description: c.visual_description,
    narrative_function: c.narrative_function,
    catchphrase: c.catchphrase,
  })),
  null,
  2,
)}

=== EPISODE PLAN ===
${JSON.stringify(episode, null, 2)}

=== STORY ELEMENTS ===
${JSON.stringify(
  analysis.story_elements,
  null,
  2,
)}

=== WORLD-BUILDING NOTES ===
Setting: ${plan.series.setting}
Tone: ${plan.series.tone}
Narrative opportunities identified: ${analysis.narrative_opportunities.join('; ')}

=== CRITICAL REQUIREMENTS ===
1. Every visual_direction MUST be a detailed, self-contained prompt (50+ words) describing the exact anime image to generate. Include art style, lighting, colors, character details, environment, mood.
2. Characters must be described by their visual appearance in EVERY visual_direction (not just by name) — the image generator doesn't know character names.
3. Story must engage the audience from first shot to last.
4. Each location needs a unique reference_prompt that describes the empty environment in extreme detail for consistent visual generation.
5. Shot IDs must follow the pattern: s{scene}_b{beat}_sh{shot} (e.g., s01_b01_sh01, s01_b01_sh02, s01_b02_sh01...)
6. Vary shot types within each scene — don't use the same shot type consecutively unless for deliberate effect.
7. Use silence and visual storytelling — not every shot needs dialogue.${
      previousEpisodes.length > 0
        ? `

=== PREVIOUS EPISODES (maintain continuity) ===
${previousEpisodes
  .map(
    (prev) =>
      `Episode ${prev.episodeNumber} "${prev.title}":
- Key points: ${prev.summaryPoints.join('; ')}
- Story beats: ${prev.storyBeats.join(', ')}
- Ended with: ${prev.cliffhanger ?? prev.teaserNextEpisode ?? 'No cliffhanger'}`,
  )
  .join('\n\n')}

IMPORTANT: This is episode ${episodeNumber} of ${plan.series.total_episodes}. Build on previous episodes — don't repeat content.`
        : ''
    }`,
    maxTokens: 16384,
    temperature: 0.8,
  });
}

// ============================================================
// PHASE 4: VISUAL PROMPTS
// ============================================================

export interface VisualPrompt {
  panel_id: string;
  style: string;
  layers: {
    background: {
      prompt: string;
      negative_prompt: string;
      color_palette: string[];
    };
    characters: Array<{
      character_id: string;
      prompt: string;
      negative_prompt: string;
    }>;
    effects: {
      prompt: string | null;
      opacity: number;
    };
  };
  composition_notes: string;
}

export interface VisualPromptsResult {
  panels: VisualPrompt[];
}

const VISUAL_PROMPTS_SYSTEM = `You are an anime art director. Convert scene descriptions into optimized prompts
for image generation models (Flux/SDXL).

RULES:
1. Each prompt must generate ONE clear, readable image
2. Always include: art style, composition, lighting, color palette
3. Separate into 3 layers: background, characters, effects/overlay
4. Use specific anime art terminology (cel shading, sakuga, etc.)
5. Include negative prompt to avoid common problems
6. Be extremely detailed and specific in visual descriptions

OUTPUT: Respond EXCLUSIVELY with valid JSON, no additional text.`;

const VISUAL_PROMPTS_SCHEMA = `{
  "panels": [
    {
      "panel_id": "s01_p01",
      "style": "string",
      "layers": {
        "background": {
          "prompt": "string (full prompt for background)",
          "negative_prompt": "string",
          "color_palette": ["#hex1", "#hex2", "#hex3"]
        },
        "characters": [
          {
            "character_id": "char_001",
            "prompt": "string (full prompt for this character)",
            "negative_prompt": "string"
          }
        ],
        "effects": {
          "prompt": "string | null",
          "opacity": 0.5
        }
      },
      "composition_notes": "string"
    }
  ]
}`;

export async function generateVisualPrompts(
  script: EpisodeScript,
  plan: SeriesPlan,
  style: string,
) {
  // Collect all panels from the script
  const allPanels = script.scenes.flatMap((scene) =>
    scene.panels.map((panel) => ({
      ...panel,
      scene_mood: scene.mood,
      scene_type: scene.scene_type,
    })),
  );

  return callClaude<VisualPromptsResult>({
    model: 'sonnet',
    systemPrompt: VISUAL_PROMPTS_SYSTEM,
    userPrompt: `Convert these anime script panels into optimized image generation prompts.

Visual style: ${style}
Follow this JSON schema:
${VISUAL_PROMPTS_SCHEMA}

CHARACTERS (for reference in prompts):
${JSON.stringify(
  plan.characters.map((c) => ({
    id: c.id,
    visual_description: c.visual_description,
  })),
  null,
  2,
)}

PANELS TO CONVERT:
${JSON.stringify(allPanels, null, 2)}`,
    maxTokens: 16384,
    temperature: 0.5,
  });
}

// ============================================================
// PHASE 4B: VIDEO SCENE PROMPTS (for LTX-2.3)
// ============================================================

export interface VideoScenePrompt {
  panel_id: string;
  video_prompt: string;
  motion_description: string;
  camera_motion: 'static' | 'dolly_forward' | 'dolly_backward' | 'jib_up' | 'jib_down' | 'focus_shift';
  suggested_duration: 6 | 8 | 10;
  key_action: string;
}

export interface VideoPromptsResult {
  panels: VideoScenePrompt[];
}

const VIDEO_PROMPTS_SYSTEM = `You are an anime cinematographer and motion director. Convert static scene descriptions
into dynamic video generation prompts optimized for AI video models (LTX-2.3).

RULES:
1. Each prompt must describe MOTION and CHANGE over time, not a static scene
2. Focus on: what moves, how it moves, the atmosphere, lighting changes
3. Use cinematic anime language: "camera slowly pushes in", "wind sweeps through hair",
   "dramatic light shift", "particles float upward"
4. Keep descriptions vivid but focused — 1-2 sentences of core action
5. Choose camera_motion based on emotional intent:
   - static: calm, dialogue-focused
   - dolly_forward: revelation, intensity building
   - dolly_backward: establishing shot, pulling back to reveal context
   - jib_up: hope, triumph, ascending
   - jib_down: pressure, gravity, descending
   - focus_shift: attention change, surprise
6. Duration: 6s for quick cuts/dialogue, 8s for standard scenes, 10s for dramatic/establishing

OUTPUT: Respond EXCLUSIVELY with valid JSON, no additional text.`;

const VIDEO_PROMPTS_SCHEMA = `{
  "panels": [
    {
      "panel_id": "s01_p01",
      "video_prompt": "string (optimized for video generation)",
      "motion_description": "string (what physically moves)",
      "camera_motion": "static | dolly_forward | dolly_backward | jib_up | jib_down | focus_shift",
      "suggested_duration": 6,
      "key_action": "string"
    }
  ]
}`;

export async function generateVideoPrompts(
  script: EpisodeScript,
  plan: SeriesPlan,
  style: string,
) {
  const allPanels = script.scenes.flatMap((scene) =>
    scene.panels.map((panel) => ({
      ...panel,
      scene_mood: scene.mood,
      scene_type: scene.scene_type,
    })),
  );

  const userPrompt = 'Convert these anime script panels into optimized VIDEO generation prompts.\n' +
    'These prompts will be used to generate 6-10 second animated clips with LTX-2.3.\n\n' +
    'Visual style: ' + style + '\n' +
    'Follow this JSON schema:\n' + VIDEO_PROMPTS_SCHEMA + '\n\n' +
    'CHARACTERS (for reference):\n' +
    JSON.stringify(
      plan.characters.map((c) => ({
        id: c.id,
        visual_description: c.visual_description,
      })),
      null,
      2,
    ) + '\n\n' +
    'PANELS TO CONVERT:\n' +
    JSON.stringify(allPanels, null, 2);

  return callClaude<VideoPromptsResult>({
    model: 'sonnet',
    systemPrompt: VIDEO_PROMPTS_SYSTEM,
    userPrompt,
    maxTokens: 16384,
    temperature: 0.5,
  });
}

// ============================================================
// SCRIPT VALIDATOR
// ============================================================

interface ValidationResult {
  is_valid: boolean;
  coverage_score: number;
  issues: Array<{
    type: 'coverage' | 'consistency' | 'pacing' | 'dialogue' | 'engagement';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
  }>;
  metrics: {
    total_panels: number;
    dialogue_density: number;
    emotional_variety: number;
    story_beats_covered: number;
    story_beats_expected: number;
  };
}

export async function validateScript(
  script: EpisodeScript,
  plan: SeriesPlan,
  analysis: ContentAnalysis,
  episodeNumber: number,
) {
  const episode = plan.episodes.find((e) => e.episode_number === episodeNumber);

  return callClaude<ValidationResult>({
    model: 'sonnet',
    systemPrompt: `You are a quality assurance specialist for anime scripts.
Analyze scripts and identify issues. Be constructive but thorough.

OUTPUT: Respond EXCLUSIVELY with valid JSON, no additional text.`,
    userPrompt: `Validate this anime script:

1. COVERAGE: Are all story beats from the episode plan present?
2. CONSISTENCY: Any plot holes or character inconsistencies?
3. PACING: Are there 3+ consecutive panels of the same type?
4. DIALOGUE: Any dialogue exceeding 15 words per line?
5. ENGAGEMENT: Is there a hook in the first 2 panels? A memorable ending?

JSON schema:
{
  "is_valid": boolean,
  "coverage_score": number 0-100,
  "issues": [{ "type": "coverage|consistency|pacing|dialogue|engagement", "severity": "low|medium|high", "description": "string", "suggestion": "string" }],
  "metrics": { "total_panels": number, "dialogue_density": number, "emotional_variety": number, "story_beats_covered": number, "story_beats_expected": number }
}

EPISODE PLAN:
${JSON.stringify(episode, null, 2)}

SCRIPT:
${JSON.stringify(script, null, 2)}

EXPECTED STORY BEATS:
${JSON.stringify(episode?.story_beats, null, 2)}`,
    maxTokens: 4096,
    temperature: 0.3,
  });
}

// ============================================================
// PHASE 5: AUDIO DIRECTION
// ============================================================

export interface AudioDirection {
  episode_number: number;
  voice_assignments: Record<
    string,
    {
      voice_type: string;
      base_settings: {
        stability: number;
        similarity_boost: number;
        style: number;
      };
    }
  >;
  audio_timeline: Array<{
    panel_id: string;
    dialogue: Array<{
      character_id: string;
      text: string;
      emotion_override: {
        stability: number;
        speed: number;
      };
      pause_after_ms: number;
    }>;
    narration: {
      text: string | null;
      speed: number;
    };
    sfx: {
      description: string | null;
      timing: 'start' | 'middle' | 'end';
      volume: number;
    };
    music: {
      action: 'continue' | 'change' | 'fade_out' | 'silence';
      new_track_prompt: string | null;
      volume: number;
    };
  }>;
  music_tracks: Array<{
    track_id: string;
    prompt: string;
    mood: string;
    duration_seconds: number;
    loop: boolean;
  }>;
}

const AUDIO_DIRECTION_SYSTEM = `You are an anime sound director. Convert scripts into technical audio specifications
for TTS (ElevenLabs) and generative music.

RULES:
1. Each character maintains the same voice throughout the series
2. Dialogue emotions translate to ElevenLabs parameters (stability, speed)
3. Music reinforces scene emotion WITHOUT competing with dialogue
4. Silences are as important as sound
5. Sound effects are subtle — this is a motion comic, not full anime

OUTPUT: Respond EXCLUSIVELY with valid JSON, no additional text.`;

const AUDIO_DIRECTION_SCHEMA = `{
  "episode_number": number,
  "voice_assignments": {
    "char_001": {
      "voice_type": "string (young enthusiastic / wise calm / cold arrogant / etc)",
      "base_settings": { "stability": 0.5, "similarity_boost": 0.75, "style": 0.3 }
    }
  },
  "audio_timeline": [
    {
      "panel_id": "s01_p01",
      "dialogue": [
        {
          "character_id": "char_001",
          "text": "exact text to synthesize",
          "emotion_override": { "stability": number, "speed": number 0.5-2.0 },
          "pause_after_ms": number
        }
      ],
      "narration": { "text": "string | null", "speed": 1.0 },
      "sfx": { "description": "string | null", "timing": "start | middle | end", "volume": 0.7 },
      "music": { "action": "continue | change | fade_out | silence", "new_track_prompt": "string | null", "volume": 0.3 }
    }
  ],
  "music_tracks": [
    { "track_id": "bgm_001", "prompt": "string for music generation", "mood": "string", "duration_seconds": number, "loop": boolean }
  ]
}`;

export async function generateAudioDirection(
  script: EpisodeScript,
  plan: SeriesPlan,
  episodeNumber: number,
  language: string,
) {
  return callClaude<AudioDirection>({
    model: 'sonnet',
    systemPrompt: AUDIO_DIRECTION_SYSTEM,
    userPrompt: `Generate audio direction for episode ${episodeNumber}.

Language: ${language}

Follow this JSON schema:
${AUDIO_DIRECTION_SCHEMA}

CHARACTERS:
${JSON.stringify(plan.characters, null, 2)}

SCRIPT:
${JSON.stringify(script, null, 2)}`,
    maxTokens: 16384,
    temperature: 0.5,
  });
}

// ============================================================
// PHASE 5B: AUDIO DIRECTION V2 (shot-based)
// ============================================================

export interface AudioDirectionV2 {
  episode_number: number;
  voice_assignments: Record<
    string,
    {
      voice_type: string;
      base_settings: {
        stability: number;
        similarity_boost: number;
        style: number;
      };
    }
  >;
  audio_timeline: Array<{
    shot_id: string;
    dialogue: Array<{
      character_id: string;
      character_name: string;
      text: string;
      delivery: string;
      pause_after_ms: number;
    }>;
    narration: {
      text: string | null;
      speed: number;
    };
    sfx: {
      description: string | null;
      timing: 'start' | 'middle' | 'end';
      volume: number;
    };
    music: {
      action: 'continue' | 'swell' | 'drop' | 'change' | 'silence';
      new_track_prompt: string | null;
      volume: number;
    };
  }>;
  music_tracks: Array<{
    track_id: string;
    prompt: string;
    mood: string;
    duration_seconds: number;
    loop: boolean;
  }>;
}

const AUDIO_DIRECTION_V2_SYSTEM = `You are an anime sound director. Convert a cinematic screenplay into technical audio specifications
for TTS (ElevenLabs) and generative music.

RULES:
1. Each character maintains the same voice throughout the series
2. The "delivery" field from the screenplay is CRITICAL — copy it exactly to guide voice acting
3. Music reinforces emotion: "swell" for climax, "drop" for tension release, "silence" for impact
4. Sound effects are cinematic — support the visual storytelling
5. Silence between shots is natural — not every shot needs audio
6. Narration should be rare and purposeful — prefer dialogue and visuals
7. Index everything by shot_id (not panel_id)

OUTPUT: Respond EXCLUSIVELY with valid JSON, no additional text.`;

const AUDIO_DIRECTION_V2_SCHEMA = `{
  "episode_number": number,
  "voice_assignments": {
    "char_001": {
      "voice_type": "string (young enthusiastic / wise calm / cold arrogant / etc)",
      "base_settings": { "stability": 0.5, "similarity_boost": 0.75, "style": 0.6 }
    }
  },
  "audio_timeline": [
    {
      "shot_id": "s01_b01_sh01",
      "dialogue": [
        {
          "character_id": "char_001",
          "character_name": "Riko",
          "text": "exact text to synthesize",
          "delivery": "whispered with wide eyes",
          "pause_after_ms": 500
        }
      ],
      "narration": { "text": "string | null", "speed": 1.0 },
      "sfx": { "description": "string | null", "timing": "start | middle | end", "volume": 0.7 },
      "music": { "action": "continue | swell | drop | change | silence", "new_track_prompt": "string | null", "volume": 0.3 }
    }
  ],
  "music_tracks": [
    { "track_id": "bgm_001", "prompt": "string for music generation", "mood": "string", "duration_seconds": number, "loop": boolean }
  ]
}`;

export async function generateAudioDirectionV2(
  screenplay: Screenplay,
  plan: SeriesPlan,
  episodeNumber: number,
  language: string,
) {
  // Flatten all shots from the screenplay for the audio timeline
  const allShots = screenplay.acts.flatMap((act) =>
    act.scenes.flatMap((scene) =>
      scene.beats.flatMap((beat) =>
        beat.shots.map((shot) => ({
          shot_id: shot.shot_id,
          shot_type: shot.shot_type,
          dialogue: shot.dialogue,
          narration: shot.narration,
          sfx_cue: shot.sfx_cue,
          music_cue: shot.music_cue,
          scene_mood: scene.mood,
        })),
      ),
    ),
  );

  return callClaude<AudioDirectionV2>({
    model: 'sonnet',
    systemPrompt: AUDIO_DIRECTION_V2_SYSTEM,
    userPrompt: `Generate audio direction for episode ${episodeNumber} (shot-based screenplay).

Language: ${language}

Follow this JSON schema:
${AUDIO_DIRECTION_V2_SCHEMA}

CHARACTERS:
${JSON.stringify(
  plan.characters.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    voice_type: c.voice_type,
  })),
  null,
  2,
)}

ALL SHOTS (with dialogue and cues from screenplay):
${JSON.stringify(allShots, null, 2)}`,
    maxTokens: 16384,
    temperature: 0.5,
  });
}

// ============================================================
// YOUTUBE METADATA GENERATION
// ============================================================

export interface YouTubeMetadata {
  title: string;
  description: string;
  tags: string[];
  chapters: Array<{ time: string; label: string }>;
  thumbnail_prompt: string;
  shorts_hook: string;
}

const YOUTUBE_METADATA_SYSTEM = `You are a YouTube SEO and content optimization expert specializing in anime content. Generate metadata that maximizes click-through rate and discoverability.

RULES:
- Title: catchy, under 60 characters, includes relevant keywords
- Description: engaging first 2 lines (shown in search), then full episode details with timestamps
- Tags: 10-15 relevant tags mixing broad ("anime") and specific ("anime action short")
- Chapters: based on the episode's scene structure
- Thumbnail prompt: describe a dramatic, eye-catching anime frame that would make someone click
- Shorts hook: the most dramatic 60-second segment described for vertical format

OUTPUT: Respond EXCLUSIVELY with valid JSON, no additional text or code blocks.`;

const YOUTUBE_METADATA_SCHEMA = `{
  "title": "string (under 60 chars, catchy, keyword-rich)",
  "description": "string (full YouTube description with timestamps)",
  "tags": ["string"],
  "chapters": [
    { "time": "0:00", "label": "string" }
  ],
  "thumbnail_prompt": "string (detailed prompt for generating an eye-catching anime thumbnail at 1280x720)",
  "shorts_hook": "string (describe the most dramatic 60s segment for YouTube Shorts)"
}`;

export async function generateYouTubeMetadata(
  screenplay: Screenplay,
  episodeTitle: string,
  seriesTitle: string,
  language: string,
) {
  return callClaude<YouTubeMetadata>({
    model: 'sonnet',
    systemPrompt: YOUTUBE_METADATA_SYSTEM,
    userPrompt: `Generate YouTube metadata for this anime episode.

Series: ${seriesTitle}
Episode: ${episodeTitle}
Language: ${language}

Follow this schema:
${YOUTUBE_METADATA_SCHEMA}

SCREENPLAY SUMMARY:
${JSON.stringify(
  {
    episode: screenplay.episode,
    scenes: screenplay.acts.flatMap((act) =>
      act.scenes.map((s) => ({
        scene_id: s.scene_id,
        location: s.location_id,
        mood: s.mood,
        narrative_function: s.narrative_function,
        shot_count: s.beats.reduce((sum, b) => sum + b.shots.length, 0),
      })),
    ),
    end_card: screenplay.end_card,
  },
  null,
  2,
)}`,
    maxTokens: 4096,
    temperature: 0.6,
  });
}
