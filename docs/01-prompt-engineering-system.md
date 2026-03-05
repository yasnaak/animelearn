# AnimeLearn — Sistema de Prompt Engineering

## Índice

1. [Visión General](#visión-general)
2. [Fase 1: Análisis de Contenido](#fase-1-análisis-de-contenido)
3. [Fase 2: Planificación de Serie](#fase-2-planificación-de-serie)
4. [Fase 3: Generación de Guión](#fase-3-generación-de-guión)
5. [Fase 4: Prompts Visuales](#fase-4-prompts-visuales)
6. [Fase 5: Dirección de Audio](#fase-5-dirección-de-audio)
7. [Gestión de Personajes](#gestión-de-personajes)
8. [Patrones Narrativos](#patrones-narrativos)
9. [Control de Calidad](#control-de-calidad)

---

## Visión General

El sistema de prompts es el **núcleo diferencial** de AnimeLearn. No estamos haciendo resúmenes con dibujos — estamos transformando conocimiento en narrativa visual. La calidad del guión determina si el usuario aprende o no.

El pipeline de prompts tiene 5 fases secuenciales. Cada fase produce un output JSON estructurado que alimenta la siguiente.

```
Contenido Raw → [Análisis] → [Planificación] → [Guión] → [Visual Prompts] → [Audio Direction]
                 Sonnet        Sonnet            Opus      Sonnet             Sonnet
```

**Principio de diseño:** Sonnet para tareas analíticas/estructurales (más rápido, más barato). Opus solo para la generación creativa del guión (donde la calidad narrativa es crítica).

---

## Fase 1: Análisis de Contenido

**Modelo:** Claude Sonnet 4.5
**Input:** Texto extraído del PDF/video
**Output:** JSON con estructura del contenido

### System Prompt

```
Eres un analista pedagógico experto. Tu trabajo es analizar contenido educativo
y extraer su estructura conceptual.

REGLAS:
- Identifica TODOS los conceptos clave, no solo los más obvios
- Ordénalos por dependencia: qué necesitas saber antes de qué
- Clasifica la dificultad de cada concepto (1-5)
- Identifica relaciones entre conceptos (prerequisito, complementario, contraste)
- Detecta el tono del contenido original (académico, casual, técnico, divulgativo)
- Estima el nivel del público objetivo (principiante, intermedio, avanzado)

OUTPUT: Responde EXCLUSIVAMENTE con un JSON válido, sin texto adicional ni
bloques de código. El JSON debe seguir exactamente este schema:
```

### Output Schema

```json
{
  "metadata": {
    "title": "string — título inferido del contenido",
    "subject_area": "string — área temática (ej: 'machine learning', 'historia medieval')",
    "source_type": "pdf | youtube_video",
    "estimated_level": "beginner | intermediate | advanced",
    "original_tone": "academic | casual | technical | popular_science",
    "total_concepts": "number",
    "estimated_study_time_minutes": "number",
    "language": "string — idioma del contenido original"
  },
  "concepts": [
    {
      "id": "concept_001",
      "name": "string — nombre del concepto",
      "description": "string — explicación breve (1-2 oraciones)",
      "difficulty": "number 1-5",
      "prerequisites": ["concept_ids que se deben entender antes"],
      "key_facts": ["dato importante 1", "dato importante 2"],
      "common_misconceptions": ["error típico que comete la gente"],
      "real_world_analogy": "string — analogía del mundo real para explicar esto",
      "emotional_hook": "string — por qué debería importarle a alguien"
    }
  ],
  "concept_relationships": [
    {
      "from": "concept_id",
      "to": "concept_id",
      "type": "prerequisite | complementary | contrast | example_of"
    }
  ],
  "suggested_episode_count": "number — episodios recomendados",
  "narrative_opportunities": [
    "string — oportunidades para crear conflicto/drama con el contenido"
  ]
}
```

### Notas de implementación

- El campo `emotional_hook` es crucial: es lo que convierte información seca en algo que le importa al espectador
- `common_misconceptions` se usan como base para el antagonista narrativo (el "malentendido" que el protagonista debe superar)
- `real_world_analogy` alimenta directamente las escenas visuales
- Si el contenido es muy largo (>10K tokens), dividir en chunks y hacer análisis por partes, luego consolidar

---

## Fase 2: Planificación de Serie

**Modelo:** Claude Sonnet 4.5
**Input:** Output de Fase 1 (análisis de contenido)
**Output:** Estructura de la serie con episodios planificados

### System Prompt

```
Eres un showrunner de anime educativo. Recibes un análisis de contenido y debes
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

OUTPUT: Responde EXCLUSIVAMENTE con JSON válido.
```

### Output Schema

```json
{
  "series": {
    "title": "string — título de la serie (estilo anime)",
    "tagline": "string — frase enganche de 1 línea",
    "total_episodes": "number",
    "tone": "shonen | seinen | slice_of_life | mystery",
    "setting": "string — dónde ocurre la historia (ej: 'academia futurista', 'laboratorio subterráneo')"
  },
  "characters": [
    {
      "id": "char_001",
      "name": "string — nombre japonés o apropiado al setting",
      "role": "protagonist | mentor | rival | comic_relief | antagonist",
      "personality_traits": ["curioso", "impulsivo", "determinado"],
      "visual_description": "string — descripción física detallada para generación de imagen",
      "voice_type": "string — tipo de voz (ej: 'joven entusiasta', 'sabio calmado', 'arrogante frío')",
      "narrative_function": "string — qué representa en la historia (ej: 'el estudiante que pregunta lo que el espectador piensa')",
      "catchphrase": "string — frase característica (opcional)"
    }
  ],
  "episodes": [
    {
      "episode_number": 1,
      "title": "string — título del episodio (estilo anime)",
      "archetype": "discovery | challenge | misconception | connection | mastery",
      "concepts_covered": ["concept_ids del análisis"],
      "synopsis": "string — resumen de 2-3 oraciones",
      "opening_hook": "string — primera escena que engancha al espectador",
      "climax": "string — momento de máxima tensión o revelación",
      "cliffhanger": "string — gancho para el siguiente episodio (null si es el último)",
      "emotional_arc": "string — ej: 'confusión → frustración → momento eureka → satisfacción'",
      "estimated_panels": "number"
    }
  ]
}
```

### Notas de implementación

- El `tone` determina el estilo visual y narrativo de toda la serie
  - **shonen**: energético, superación, ideal para temas técnicos desafiantes
  - **seinen**: más maduro, reflexivo, ideal para filosofía/negocios/ciencias sociales
  - **slice_of_life**: cotidiano, relajado, ideal para idiomas/habilidades blandas
  - **mystery**: investigación, pistas, ideal para historia/ciencia/análisis
- Limitar a 3-4 personajes máximo para mantener consistencia visual
- El `visual_description` de cada personaje debe ser extremadamente específico (color pelo, ojos, ropa, accesorios) para consistencia en generación de imágenes

---

## Fase 3: Generación de Guión

**Modelo:** Claude Opus 4.5 ⚠️ (único paso donde se usa Opus por calidad narrativa)
**Input:** Output de Fase 1 + Fase 2
**Output:** Guión completo panel-por-panel

### System Prompt

```
Eres un guionista de anime educativo premiado. Escribes guiones que la gente
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

OUTPUT: Responde EXCLUSIVAMENTE con JSON válido.
```

### Output Schema

```json
{
  "episode": {
    "number": 1,
    "title": "string",
    "duration_estimate_seconds": "number"
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
          "visual_description": "string — descripción detallada de la composición visual",
          "background": {
            "description": "string — descripción del fondo",
            "time_of_day": "dawn | morning | afternoon | evening | night",
            "weather": "clear | cloudy | rain | snow | none_indoor"
          },
          "characters_in_panel": [
            {
              "character_id": "char_001",
              "position": "left | center | right | background",
              "expression": "string — emoción específica (ej: 'ojos abiertos con asombro, boca entreabierta')",
              "pose": "string — postura del cuerpo (ej: 'inclinado hacia adelante, puños apretados')",
              "facing": "viewer | left | right | away"
            }
          ],
          "dialogue": [
            {
              "character_id": "char_001",
              "text": "string — máximo 15 palabras",
              "tone": "excited | calm | angry | sad | sarcastic | whisper | shout"
            }
          ],
          "narration": "string | null — texto de narrador si aplica",
          "sfx": "string | null — efecto de sonido (ej: 'CRACK!', 'whoosh suave')",
          "music_direction": "string | null — cambio musical si aplica (ej: 'sube tensión', 'silencio súbito')",
          "parallax": {
            "background_movement": "string — dirección y velocidad (ej: 'slow pan left')",
            "character_movement": "string — (ej: 'slight zoom in')",
            "effect_layer": "string | null — efecto sobre todo (ej: 'partículas flotando')"
          },
          "educational_note": "string — qué concepto se está transmitiendo en este panel y cómo"
        }
      ],
      "transition_to_next": "cut | fade_black | fade_white | swipe_left | zoom_out | dissolve"
    }
  ],
  "end_card": {
    "summary_points": ["string — 3-5 puntos clave aprendidos en este episodio"],
    "teaser_next_episode": "string | null — frase teaser del siguiente episodio"
  }
}
```

### Notas de implementación

- Este es el prompt más caro (~$0.45/episodio) pero es donde se hace o se rompe la calidad
- El campo `educational_note` NO se muestra al usuario — es para debugging y QA
- `parallax` directions se traducen directamente a animaciones en Remotion
- Considerar un paso de validación post-generación donde Sonnet verifica que todos los conceptos del plan se cubren en el guión

---

## Fase 4: Prompts Visuales

**Modelo:** Claude Sonnet 4.5
**Input:** Output de Fase 3 (guión) + character sheets
**Output:** Prompts optimizados para Flux/SDXL

### System Prompt

```
Eres un director de arte de anime. Tu trabajo es convertir descripciones de
escenas en prompts optimizados para modelos de generación de imágenes (Flux/SDXL).

REGLAS DE PROMPT:
1. Cada prompt debe generar UNA imagen clara y legible
2. Incluye siempre: estilo artístico, composición, iluminación, paleta de color
3. Referencia al character sheet para consistencia (se pasa como imagen)
4. Separa en 3 capas: fondo, personajes, efectos/overlay
5. Usa terminología específica de arte anime (cel shading, sakuga, etc.)
6. Incluye negative prompt para evitar problemas comunes

ESTILOS BASE DISPONIBLES:
- "clean_modern": líneas limpias, colores vibrantes (tipo Spy x Family, Jujutsu Kaisen)
- "soft_pastel": tonos suaves, iluminación cálida (tipo Violet Evergarden)
- "dark_dramatic": contraste alto, sombras profundas (tipo Attack on Titan)
- "retro_classic": estilo años 90, menos detalle pero muy expresivo (tipo Cowboy Bebop)

OUTPUT: Responde EXCLUSIVAMENTE con JSON válido.
```

### Output Schema

```json
{
  "panel_id": "s01_p01",
  "style": "clean_modern | soft_pastel | dark_dramatic | retro_classic",
  "layers": {
    "background": {
      "prompt": "string — prompt completo para el fondo",
      "negative_prompt": "string",
      "aspect_ratio": "16:9 | 4:3 | 1:1 | 9:16",
      "color_palette": ["#hex1", "#hex2", "#hex3"]
    },
    "characters": {
      "prompt": "string — prompt para los personajes (con referencia a character sheet)",
      "negative_prompt": "string",
      "character_refs": ["char_001 — se adjuntará el character sheet como imagen"]
    },
    "effects": {
      "prompt": "string | null — overlay de efectos (partículas, luces, etc.)",
      "opacity": "number 0-1"
    }
  },
  "composition_notes": "string — notas sobre cómo combinar las capas en Remotion"
}
```

### Notas de implementación

- Los prompts de personaje SIEMPRE deben incluir referencia al character sheet via IP-Adapter o img2img
- Generar cada capa por separado permite el efecto parallax en Remotion
- Para la capa de personajes, usar rembg o similar para quitar fondo automáticamente
- Considerar generar 2-3 variantes por panel y seleccionar la mejor (o dejar al usuario elegir)
- El negative prompt es crítico para evitar: dedos extra, texto ilegible, inconsistencia de estilo

---

## Fase 5: Dirección de Audio

**Modelo:** Claude Sonnet 4.5
**Input:** Output de Fase 3 (guión)
**Output:** Especificaciones para ElevenLabs y Suno

### System Prompt

```
Eres un director de sonido de anime. Conviertes guiones en especificaciones
técnicas de audio para TTS (ElevenLabs) y música generativa (Suno).

REGLAS:
1. Cada personaje mantiene la misma voz en toda la serie
2. Las emociones del diálogo se traducen a parámetros de ElevenLabs (stability, similarity, style)
3. La música debe reforzar la emoción de cada escena SIN competir con el diálogo
4. Los silencios son tan importantes como el sonido
5. Los efectos de sonido son sutiles — estamos haciendo motion comic, no anime completo

OUTPUT: Responde EXCLUSIVAMENTE con JSON válido.
```

### Output Schema

```json
{
  "episode_number": 1,
  "voice_assignments": {
    "char_001": {
      "elevenlabs_voice_id": "string — se asigna en setup",
      "base_settings": {
        "stability": 0.5,
        "similarity_boost": 0.75,
        "style": 0.3
      }
    }
  },
  "audio_timeline": [
    {
      "panel_id": "s01_p01",
      "dialogue": [
        {
          "character_id": "char_001",
          "text": "string — texto exacto a sintetizar",
          "emotion_override": {
            "stability": "number — override para esta línea si difiere del base",
            "speed": "number 0.5-2.0 — velocidad relativa"
          },
          "pause_after_ms": "number — pausa después del diálogo"
        }
      ],
      "narration": {
        "text": "string | null",
        "voice": "narrator",
        "speed": 1.0
      },
      "sfx": {
        "description": "string | null",
        "timing": "start | middle | end",
        "volume": "number 0-1"
      },
      "music": {
        "action": "continue | change | fade_out | silence",
        "new_track_prompt": "string | null — prompt para Suno si cambia",
        "volume": "number 0-1"
      }
    }
  ],
  "music_tracks": [
    {
      "track_id": "bgm_001",
      "suno_prompt": "string — prompt descriptivo para Suno",
      "mood": "string",
      "duration_seconds": "number",
      "loop": "boolean"
    }
  ]
}
```

---

## Gestión de Personajes

### Character Sheet Generation

Antes de generar cualquier panel, se generan character sheets para mantener consistencia visual.

**Prompt base para character sheet:**

```
[STYLE] anime character design sheet, multiple views, white background,
clean line art with flat colors

[CHARACTER] {visual_description del personaje}

[VIEWS] front view, 3/4 view, side profile, back view

[EXPRESSIONS] neutral, happy, angry, surprised, sad, determined

[DETAILS] consistent outfit, consistent hair color and style,
consistent eye color, height reference

[QUALITY] high quality, detailed, professional character design,
anime style, cel shading

[NEGATIVE] blurry, low quality, realistic, 3D render, multiple characters,
background scenery, text, watermark
```

### Persistencia de personajes entre episodios

```
Estrategia de consistencia:
1. Generar character sheet una vez → almacenar en S3
2. Para cada panel, pasar el character sheet como referencia via IP-Adapter
3. Mantener un "style guide" por serie: paleta de colores, grosor de línea, nivel de detalle
4. Si la consistencia falla en un panel → regenerar con seed diferente (máx 3 intentos)
5. Fallback: usar solo la vista frontal del character sheet y ajustar pose con ControlNet
```

---

## Patrones Narrativos

### Mapeo Concepto → Narrativa

Estos son los patrones probados para convertir tipos de contenido en narrativa:

| Tipo de contenido | Patrón narrativo | Ejemplo |
|---|---|---|
| Proceso paso a paso | Viaje/quest con etapas | "Compilación de código" → el personaje atraviesa salas de una torre, cada sala es un paso del compilador |
| Comparación A vs B | Duelo/debate entre personajes | "SQL vs NoSQL" → dos rivales que defienden su enfoque ante un juez |
| Concepto abstracto | Metáfora visual concreta | "Recursión" → el personaje entra en una habitación que contiene una versión más pequeña de sí misma |
| Datos/estadísticas | Descubrimiento/investigación | "Cambio climático" → detective investigando pistas que resultan ser datos |
| Historia cronológica | Flashbacks/viaje en el tiempo | "Guerra Fría" → el protagonista encuentra un diario y revive los eventos |
| Habilidad práctica | Entrenamiento/montaje | "Negociación" → el personaje practica con NPCs cada vez más difíciles |

### Arquetipos de Antagonista Educativo

El "villano" en un anime educativo no es una persona — es un concepto erróneo:

- **El Simplificador**: dice que todo es fácil, omite matices. El protagonista descubre que la realidad es más compleja.
- **El Memorizador**: quiere que repitas sin entender. El protagonista demuestra que entender es más poderoso.
- **El Dogmático**: insiste en que solo hay una forma correcta. El protagonista encuentra perspectivas alternativas.
- **El Caos**: desorden, información contradictoria. El protagonista impone estructura y claridad.

---

## Control de Calidad

### Validación Post-Generación

Después de generar el guión (Fase 3), ejecutar este prompt de validación con Sonnet:

```
Analiza este guión de anime educativo y verifica:

1. COBERTURA: ¿Se cubren TODOS los conceptos del plan de episodio? Lista los que faltan.
2. PRECISIÓN: ¿Hay alguna afirmación factualmente incorrecta o simplificación engañosa?
3. NARRATIVA: ¿Hay 3+ paneles consecutivos del mismo tipo (solo diálogo, solo acción)?
4. DIÁLOGO: ¿Algún diálogo supera las 15 palabras por línea?
5. RITMO: ¿El episodio tiene un arco emocional claro (inicio, subida, clímax, resolución)?
6. ACCESIBILIDAD: ¿Puede alguien sin conocimiento previo seguir la historia?
7. ENGAGEMENT: ¿Hay un hook en los primeros 2 paneles? ¿Hay un cierre memorable?

Para cada problema encontrado, sugiere una corrección específica.
```

### Métricas de Calidad de Guión

- **Concept Coverage Score**: % de conceptos del plan que aparecen en el guión → objetivo: 100%
- **Dialogue Density**: palabras de diálogo / paneles totales → objetivo: 15-25 (ni muy denso ni vacío)
- **Show vs Tell Ratio**: paneles donde el concepto se muestra visualmente vs se explica verbalmente → objetivo: >60% show
- **Emotional Variety**: número de emociones distintas en el episodio → objetivo: ≥4
- **Cliffhanger Strength**: evaluación subjetiva (1-5) del gancho final → objetivo: ≥3
