import { callClaude } from './claude';
import { chunkText } from './text-chunker';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface ContentAnalysis {
  metadata: {
    title: string;
    subject_area: string;
    source_type: string;
    estimated_level: 'beginner' | 'intermediate' | 'advanced';
    original_tone: 'academic' | 'casual' | 'technical' | 'popular_science';
    total_concepts: number;
    estimated_study_time_minutes: number;
    language: string;
  };
  concepts: Array<{
    id: string;
    name: string;
    description: string;
    difficulty: number;
    prerequisites: string[];
    key_facts: string[];
    common_misconceptions: string[];
    real_world_analogy: string;
    emotional_hook: string;
  }>;
  concept_relationships: Array<{
    from: string;
    to: string;
    type: 'prerequisite' | 'complementary' | 'contrast' | 'example_of';
  }>;
  suggested_episode_count: number;
  narrative_opportunities: string[];
}

export interface SeriesPlan {
  series: {
    title: string;
    tagline: string;
    total_episodes: number;
    tone: 'shonen' | 'seinen' | 'slice_of_life' | 'mystery';
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
    archetype: 'discovery' | 'challenge' | 'misconception' | 'connection' | 'mastery';
    concepts_covered: string[];
    synopsis: string;
    opening_hook: string;
    climax: string;
    cliffhanger: string | null;
    emotional_arc: string;
    estimated_panels: number;
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
      educational_note: string;
    }>;
    transition_to_next: string;
  }>;
  end_card: {
    summary_points: string[];
    teaser_next_episode: string | null;
  };
}

export interface QuizData {
  questions: Array<{
    id: string;
    type: 'multiple_choice' | 'true_false';
    question: string;
    options: string[];
    correct_answer: number;
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
    concept_tested: string;
  }>;
  passing_score: number;
  total_points: number;
}

export interface StudyNotes {
  title: string;
  summary: string;
  key_concepts: Array<{
    name: string;
    definition: string;
    importance: string;
  }>;
  key_takeaways: string[];
  review_questions: string[];
  connections_to_next: string | null;
}

// ============================================================
// PHASE 1: CONTENT ANALYSIS
// ============================================================

const ANALYSIS_SYSTEM_PROMPT = `Eres un analista pedagógico experto. Tu trabajo es analizar contenido educativo
y extraer su estructura conceptual.

REGLAS:
- Identifica TODOS los conceptos clave, no solo los más obvios
- Ordénalos por dependencia: qué necesitas saber antes de qué
- Clasifica la dificultad de cada concepto (1-5)
- Identifica relaciones entre conceptos (prerequisito, complementario, contraste)
- Detecta el tono del contenido original (académico, casual, técnico, divulgativo)
- Estima el nivel del público objetivo (principiante, intermedio, avanzado)

OUTPUT: Responde EXCLUSIVAMENTE con un JSON válido, sin texto adicional ni bloques de código.`;

const ANALYSIS_SCHEMA = `{
  "metadata": {
    "title": "string",
    "subject_area": "string",
    "source_type": "pdf | youtube_video",
    "estimated_level": "beginner | intermediate | advanced",
    "original_tone": "academic | casual | technical | popular_science",
    "total_concepts": number,
    "estimated_study_time_minutes": number,
    "language": "string"
  },
  "concepts": [
    {
      "id": "concept_001",
      "name": "string",
      "description": "string (1-2 sentences)",
      "difficulty": number 1-5,
      "prerequisites": ["concept_ids"],
      "key_facts": ["string"],
      "common_misconceptions": ["string"],
      "real_world_analogy": "string",
      "emotional_hook": "string"
    }
  ],
  "concept_relationships": [
    { "from": "concept_id", "to": "concept_id", "type": "prerequisite | complementary | contrast | example_of" }
  ],
  "suggested_episode_count": number,
  "narrative_opportunities": ["string"]
}`;

export async function analyzeContent(
  rawContent: string,
  sourceType: 'pdf' | 'youtube',
  language: string,
) {
  const chunks = chunkText(rawContent, { maxTokens: 8000 });

  if (chunks.length === 1) {
    // Single chunk — direct analysis
    return callClaude<ContentAnalysis>({
      model: 'sonnet',
      systemPrompt: ANALYSIS_SYSTEM_PROMPT,
      userPrompt: `Analyze the following ${sourceType === 'pdf' ? 'PDF' : 'YouTube transcript'} content and produce a JSON analysis following this schema:\n\n${ANALYSIS_SCHEMA}\n\nContent language: ${language}\n\n---\n\n${rawContent}`,
      maxTokens: 8192,
      temperature: 0.5,
    });
  }

  // Multi-chunk: analyze each, then consolidate
  const partialAnalyses: ContentAnalysis[] = [];
  for (const chunk of chunks) {
    const result = await callClaude<ContentAnalysis>({
      model: 'sonnet',
      systemPrompt: ANALYSIS_SYSTEM_PROMPT,
      userPrompt: `Analyze this chunk (part of a larger document) and produce a JSON analysis following this schema:\n\n${ANALYSIS_SCHEMA}\n\nContent language: ${language}\n\n---\n\n${chunk}`,
      maxTokens: 8192,
      temperature: 0.5,
    });
    partialAnalyses.push(result.data);
  }

  // Consolidate
  const consolidateResult = await callClaude<ContentAnalysis>({
    model: 'sonnet',
    systemPrompt: ANALYSIS_SYSTEM_PROMPT,
    userPrompt: `You analyzed a document in ${chunks.length} parts. Here are the partial analyses. Consolidate them into a single coherent analysis, removing duplicates, fixing concept IDs to be sequential, and updating relationships.\n\nSchema:\n${ANALYSIS_SCHEMA}\n\nPartial analyses:\n${JSON.stringify(partialAnalyses, null, 2)}`,
    maxTokens: 8192,
    temperature: 0.3,
  });

  return consolidateResult;
}

// ============================================================
// PHASE 2: SERIES PLANNING
// ============================================================

const PLANNING_SYSTEM_PROMPT = `Eres un showrunner de anime educativo. Recibes un análisis de contenido y debes
planificar una mini-serie que enseñe todo el material.

PRINCIPIOS DE DISEÑO DE SERIE:
1. Cada episodio debe ser auto-contenido pero dejar ganas del siguiente
2. Primer episodio: hook fuerte, introduce personajes, plantea EL problema central
3. Episodios intermedios: cada uno resuelve un sub-problema mientras revela más complejidad
4. Último episodio: todo se conecta, momento "eureka" del protagonista
5. Máximo 3-5 minutos por episodio (10-15 paneles, ~200 palabras de diálogo)
6. Cada episodio debe cubrir 2-4 conceptos (no más, o se pierde profundidad)

ARQUETIPOS DE EPISODIO:
- "El Descubrimiento": el protagonista encuentra algo nuevo y quiere entenderlo
- "El Desafío": un problema que parece imposible hasta que aplica lo aprendido
- "El Malentendido": el protagonista cree algo incorrecto y debe corregir su visión
- "La Conexión": dos ideas aparentemente separadas resultan estar conectadas
- "La Maestría": el protagonista demuestra dominio integrando todo

OUTPUT: Responde EXCLUSIVAMENTE con JSON válido, sin texto adicional ni bloques de código.`;

const PLANNING_SCHEMA = `{
  "series": {
    "title": "string (anime-style title)",
    "tagline": "string (one-line hook)",
    "total_episodes": number,
    "tone": "shonen | seinen | slice_of_life | mystery",
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
      "archetype": "discovery | challenge | misconception | connection | mastery",
      "concepts_covered": ["concept_ids"],
      "synopsis": "string (2-3 sentences)",
      "opening_hook": "string",
      "climax": "string",
      "cliffhanger": "string | null",
      "emotional_arc": "string",
      "estimated_panels": number
    }
  ]
}`;

export async function planSeries(
  analysis: ContentAnalysis,
  style: string,
  language: string,
) {
  return callClaude<SeriesPlan>({
    model: 'sonnet',
    systemPrompt: PLANNING_SYSTEM_PROMPT,
    userPrompt: `Based on this content analysis, plan an anime series.\n\nVisual style: ${style}\nLanguage for dialogue: ${language}\n\nFollow this JSON schema:\n${PLANNING_SCHEMA}\n\nContent Analysis:\n${JSON.stringify(analysis, null, 2)}`,
    maxTokens: 8192,
    temperature: 0.7,
  });
}

// ============================================================
// PHASE 3: SCRIPT GENERATION
// ============================================================

const SCRIPT_SYSTEM_PROMPT = `Eres un guionista de anime educativo premiado. Escribes guiones que la gente
recuerda años después. Tu superpoder: hacer que conceptos complejos se SIENTAN,
no solo se entiendan.

REGLAS DE GUIÓN:
1. SHOW, DON'T TELL — nunca hagas que un personaje "explique" un concepto directamente.
   En su lugar, haz que lo DESCUBRA, lo EXPERIMENTE, o FALLE al aplicarlo mal.
2. Cada panel tiene máximo 2 líneas de diálogo (15 palabras por línea máximo).
   El silencio es poderoso. Usa paneles sin diálogo para momentos de impacto.
3. La información se transmite por: diálogo (30%), visual (50%), contexto/subtexto (20%)
4. Cada escena necesita CONFLICTO — incluso si es interno (duda, confusión, miedo a fallar)
5. Los conceptos erróneos son TAN importantes como los correctos — el espectador
   aprende viendo al personaje equivocarse y corregirse
6. Usa el "patrón de tres": introduce concepto → aplica mal → aplica bien
7. El ritmo alterna: acción/diálogo/silencio/acción — nunca 3 paneles seguidos del mismo tipo

FORMATO DE PANEL:
Cada panel es una unidad visual independiente. Describe:
- Composición visual (qué se ve, dónde está cada elemento)
- Expresión de los personajes (emoción específica)
- Diálogo (si hay)
- Efecto de sonido o música (si cambia)
- Movimiento parallax sugerido (qué capa se mueve, en qué dirección)

IMPORTANTE: El contenido educativo debe ser EXACTO y PRECISO. No sacrifiques
precisión por narrativa. Si un concepto tiene matices, inclúyelos. La narrativa
es el vehículo, no el destino.

OUTPUT: Responde EXCLUSIVAMENTE con JSON válido, sin texto adicional ni bloques de código.`;

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
          },
          "educational_note": "string"
        }
      ],
      "transition_to_next": "cut | fade_black | fade_white | swipe_left | zoom_out | dissolve"
    }
  ],
  "end_card": {
    "summary_points": ["string (3-5 key points)"],
    "teaser_next_episode": "string | null"
  }
}`;

export async function generateScript(
  analysis: ContentAnalysis,
  plan: SeriesPlan,
  episodeNumber: number,
  language: string,
) {
  const episode = plan.episodes.find((e) => e.episode_number === episodeNumber);
  if (!episode) {
    throw new Error(`Episode ${episodeNumber} not found in series plan`);
  }

  return callClaude<EpisodeScript>({
    model: 'opus',
    systemPrompt: SCRIPT_SYSTEM_PROMPT,
    userPrompt: `Generate a complete panel-by-panel script for episode ${episodeNumber}.

Language for all dialogue and narration: ${language}

Follow this JSON schema exactly:
${SCRIPT_SCHEMA}

SERIES INFO:
${JSON.stringify(plan.series, null, 2)}

CHARACTERS:
${JSON.stringify(plan.characters, null, 2)}

EPISODE PLAN:
${JSON.stringify(episode, null, 2)}

RELEVANT CONCEPTS FROM ANALYSIS:
${JSON.stringify(
  analysis.concepts.filter((c) => episode.concepts_covered.includes(c.id)),
  null,
  2,
)}`,
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
    type: 'coverage' | 'accuracy' | 'pacing' | 'dialogue' | 'engagement';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
  }>;
  metrics: {
    total_panels: number;
    dialogue_density: number;
    emotional_variety: number;
    concepts_covered: number;
    concepts_expected: number;
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
    systemPrompt: `You are a quality assurance specialist for educational anime scripts.
Analyze scripts and identify issues. Be constructive but thorough.

OUTPUT: Respond EXCLUSIVELY with valid JSON, no additional text.`,
    userPrompt: `Validate this anime educational script:

1. COVERAGE: Are ALL concepts from the episode plan covered? List missing ones.
2. ACCURACY: Any factually incorrect statements or misleading simplifications?
3. PACING: Are there 3+ consecutive panels of the same type?
4. DIALOGUE: Any dialogue exceeding 15 words per line?
5. ENGAGEMENT: Is there a hook in the first 2 panels? A memorable ending?

JSON schema:
{
  "is_valid": boolean,
  "coverage_score": number 0-100,
  "issues": [{ "type": "coverage|accuracy|pacing|dialogue|engagement", "severity": "low|medium|high", "description": "string", "suggestion": "string" }],
  "metrics": { "total_panels": number, "dialogue_density": number, "emotional_variety": number, "concepts_covered": number, "concepts_expected": number }
}

EPISODE PLAN:
${JSON.stringify(episode, null, 2)}

SCRIPT:
${JSON.stringify(script, null, 2)}

EXPECTED CONCEPTS:
${JSON.stringify(
  analysis.concepts.filter((c) => episode?.concepts_covered.includes(c.id)),
  null,
  2,
)}`,
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
// PHASE 6: QUIZ GENERATION
// ============================================================

const QUIZ_SYSTEM_PROMPT = `You are an expert educational assessment designer. Generate quiz questions that test genuine comprehension — not just memorization.

RULES:
- Create a mix of multiple_choice and true_false questions
- Multiple choice: exactly 4 options, one correct
- Use common misconceptions as plausible wrong answers
- Explanations should teach, not just state the answer
- Questions should progress from easy to hard
- Test recall, comprehension, AND application
- Write in the same language as the episode content

OUTPUT: Respond EXCLUSIVELY with valid JSON, no additional text or code blocks.`;

const QUIZ_SCHEMA = `{
  "questions": [
    {
      "id": "q_001",
      "type": "multiple_choice | true_false",
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correct_answer": 0,
      "explanation": "string (2-3 sentences explaining why)",
      "difficulty": "easy | medium | hard",
      "concept_tested": "string (concept name)"
    }
  ],
  "passing_score": 60,
  "total_points": number
}`;

export async function generateQuiz(
  script: EpisodeScript,
  analysis: ContentAnalysis,
  episodeNumber: number,
  language: string,
) {
  const episodeConcepts = analysis.concepts.map((c) => ({
    name: c.name,
    key_facts: c.key_facts,
    misconceptions: c.common_misconceptions,
  }));

  return callClaude<QuizData>({
    model: 'sonnet',
    systemPrompt: QUIZ_SYSTEM_PROMPT,
    userPrompt: `Generate 5-7 quiz questions for Episode ${episodeNumber} based on the following.

Language: ${language}

EPISODE SUMMARY POINTS:
${JSON.stringify(script.end_card.summary_points)}

CONCEPTS COVERED:
${JSON.stringify(episodeConcepts, null, 2)}

KEY EDUCATIONAL NOTES FROM PANELS:
${script.scenes
  .flatMap((s) => s.panels.map((p) => p.educational_note))
  .filter(Boolean)
  .join('\n- ')}

Follow this schema:
${QUIZ_SCHEMA}`,
    maxTokens: 4096,
    temperature: 0.5,
  });
}

// ============================================================
// PHASE 7: STUDY NOTES GENERATION
// ============================================================

const STUDY_NOTES_SYSTEM_PROMPT = `You are an expert study guide creator. Generate concise, well-structured study notes that help students review and retain what they learned.

RULES:
- Write clear, student-friendly definitions
- Highlight why each concept matters
- Include self-test review questions (open-ended, no answers)
- If there's a next episode, connect concepts forward
- Write in the same language as the episode content

OUTPUT: Respond EXCLUSIVELY with valid JSON, no additional text or code blocks.`;

const STUDY_NOTES_SCHEMA = `{
  "title": "string (episode title)",
  "summary": "string (2-3 paragraph summary of the episode)",
  "key_concepts": [
    {
      "name": "string",
      "definition": "string (clear, concise definition)",
      "importance": "string (why this matters)"
    }
  ],
  "key_takeaways": ["string (actionable insight)"],
  "review_questions": ["string (open-ended question for self-study)"],
  "connections_to_next": "string | null"
}`;

export async function generateStudyNotes(
  script: EpisodeScript,
  analysis: ContentAnalysis,
  episodeNumber: number,
  teaserNext: string | null,
  language: string,
) {
  return callClaude<StudyNotes>({
    model: 'sonnet',
    systemPrompt: STUDY_NOTES_SYSTEM_PROMPT,
    userPrompt: `Generate study notes for Episode ${episodeNumber}: "${script.episode.title}"

Language: ${language}

EPISODE SUMMARY POINTS:
${JSON.stringify(script.end_card.summary_points)}

CONCEPTS COVERED:
${JSON.stringify(
  analysis.concepts.map((c) => ({
    name: c.name,
    description: c.description,
    key_facts: c.key_facts,
    analogy: c.real_world_analogy,
  })),
  null,
  2,
)}

EDUCATIONAL NOTES:
${script.scenes
  .flatMap((s) => s.panels.map((p) => p.educational_note))
  .filter(Boolean)
  .join('\n- ')}

TEASER FOR NEXT EPISODE: ${teaserNext ?? 'None (final episode)'}

Follow this schema:
${STUDY_NOTES_SCHEMA}`,
    maxTokens: 4096,
    temperature: 0.5,
  });
}
