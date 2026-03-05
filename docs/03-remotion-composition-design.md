# AnimeLearn — Diseño de Composición Remotion

## Índice

1. [Anatomía de un Episodio](#anatomía-de-un-episodio)
2. [Sistema de Parallax](#sistema-de-parallax)
3. [Transiciones](#transiciones)
4. [Sincronización de Audio](#sincronización-de-audio)
5. [Componentes Clave](#componentes-clave)
6. [Timing y Ritmo](#timing-y-ritmo)
7. [Ejemplo de Composición Completa](#ejemplo-de-composición-completa)
8. [Configuración de Render](#configuración-de-render)

---

## Anatomía de un Episodio

Un episodio de 4 minutos a 30fps = **7,200 frames**. La estructura tipo:

```
[Intro: 5s = 150 frames]
  → Logo AnimeLearn + título del episodio
  → Música de intro (siempre la misma para reconocimiento de marca)

[Recap: 5s = 150 frames] (solo si no es episodio 1)
  → "Anteriormente en {serie}..."
  → 2-3 paneles clave del episodio anterior

[Cuerpo: 180s = 5,400 frames]
  → 4-6 escenas
  → Cada escena: 3-5 paneles
  → Total: ~15-20 paneles

[End Card: 15s = 450 frames]
  → Resumen de puntos clave (texto sobre fondo)
  → Teaser del siguiente episodio
  → CTA: "Suscríbete para más" / logo

[Outro: 5s = 150 frames]
  → Créditos mínimos + música de cierre
```

---

## Sistema de Parallax

El efecto parallax es lo que distingue un motion comic de una slideshow. Cada panel tiene 3 capas que se mueven a velocidades diferentes.

### Capas

```
Capa 3 (frontal):  Efectos (partículas, destellos, humo)    → se mueve MÁS rápido
Capa 2 (media):    Personajes                                 → se mueve velocidad MEDIA
Capa 1 (fondo):    Background/escenario                       → se mueve MÁS lento (o estático)
```

### Tipos de movimiento parallax

| Tipo | Descripción | Uso narrativo |
|------|-------------|---------------|
| `slow_pan_left` | Todo se mueve lentamente a la izquierda | Transición temporal, paso del tiempo |
| `slow_pan_right` | Todo a la derecha | Avance, progreso |
| `zoom_in` | Zoom suave hacia el centro | Foco en detalle, tensión creciente |
| `zoom_out` | Zoom hacia afuera | Revelación, contexto amplio |
| `shake` | Vibración sutil | Impacto, sorpresa, explosión |
| `float` | Movimiento vertical suave | Calma, reflexión, espacio onírico |
| `dramatic_zoom` | Zoom rápido a un punto | Momento eureka, realización |
| `static` | Sin movimiento | Pausa dramática, diálogo importante |

### Implementación conceptual del componente ParallaxLayer

```
Estructura del componente:
- Recibe: imageUrl, depth (1-3), movement type, duration
- Calcula interpolación basada en el frame actual
- Depth 1 (fondo): movimiento × 0.3
- Depth 2 (personajes): movimiento × 0.6
- Depth 3 (efectos): movimiento × 1.0
- Usa spring() de Remotion para movimiento natural
- Las imágenes se renderizan 20% más grandes que el viewport
  para permitir movimiento sin bordes visibles
```

### Ken Burns Effect

Para paneles estáticos (sin movimiento de personaje), aplicar un Ken Burns sutil:

```
Comportamiento:
- Scale de 1.0 a 1.08 a lo largo del panel (8% zoom)
- Combinado con pan suave en una dirección
- Duración: todo el tiempo que dura el panel
- Esto evita que cualquier panel se sienta "muerto"
```

---

## Transiciones

### Entre paneles (dentro de una escena)

| Transición | Frames | Uso |
|------------|--------|-----|
| `cut` | 0 | Corte directo. Acción rápida, mismo momento. |
| `crossfade` | 15 (0.5s) | Default. Cambio suave entre paneles. |
| `slide_left` | 12 | Siguiente panel entra desde la derecha. Progresión. |
| `slide_up` | 12 | Panel entra desde abajo. Escalada/ascenso. |
| `wipe_diagonal` | 10 | Estilo manga. Energético. |

### Entre escenas

| Transición | Frames | Uso |
|------------|--------|-----|
| `fade_black` | 30 (1s) | Cambio de escena importante. Paso del tiempo. |
| `fade_white` | 30 | Revelación, iluminación, momento de claridad. |
| `swipe_with_sfx` | 20 | Cambio enérgico con efecto de sonido. |
| `zoom_blur` | 25 | Flashback o cambio de perspectiva. |
| `dissolve` | 40 | Cambio emocional suave. Reflexión. |

### Implementación conceptual

```
Cada transición es un componente React que:
1. Recibe el panel saliente y entrante como children
2. Interpola opacidad/posición/escala basado en frame actual
3. Usa el interpolate() de Remotion con curvas ease-in-out
4. El audio crossfade se maneja por separado en el mixer
```

---

## Sincronización de Audio

### Timeline de audio

El audio tiene 4 capas que se mezclan:

```
Capa 4 (top):    SFX (efectos de sonido)          → volumen: 0.7-1.0
Capa 3:          Diálogo (TTS de ElevenLabs)       → volumen: 1.0 (siempre prioridad)
Capa 2:          Narración                          → volumen: 0.9
Capa 1 (base):   Música de fondo                   → volumen: 0.2-0.4 (baja durante diálogo)
```

### Ducking automático

```
Comportamiento de ducking de música:
- Cuando hay diálogo: música baja a 0.15 (fade de 500ms)
- Cuando no hay diálogo: música sube a 0.35 (fade de 1000ms)
- Nunca cortar música abruptamente
- Mantener música a 0.05 mínimo (nunca silencio total en escenas con música)
```

### Timing por panel

```
Para cada panel, el timing se calcula así:

1. Duración del diálogo (de ElevenLabs) + pausa → define duración mínima
2. Si no hay diálogo: duración basada en complejidad visual
   - Panel simple: 2.5s
   - Panel con detalle: 3.5s
   - Panel climático: 4.5s
3. Padding: 0.5s antes y después del diálogo
4. Transición: se superpone con el padding final

Fórmula:
  panel_duration = max(dialogue_duration + 1s, min_visual_duration) + transition_overlap
```

### Subtítulos

```
Formato: VTT sincronizado con el audio
Generación:
  1. ElevenLabs devuelve timestamps por palabra
  2. Se agrupan en líneas de máximo 42 caracteres
  3. Se exporta como archivo .vtt
  4. Remotion renderiza los subtítulos como overlay
  5. Estilo: fondo semi-transparente negro, texto blanco, fuente sans-serif
```

---

## Componentes Clave

### Panel (componente principal)

```
Props:
  - backgroundImage: URL de la capa de fondo
  - characterImage: URL de la capa de personajes
  - effectImage: URL de la capa de efectos (opcional)
  - parallaxConfig: tipo de movimiento + intensidad
  - duration: frames totales
  - dialogueAudio: URL del audio de diálogo
  - dialogueStart: frame donde empieza el diálogo

Estructura interna:
  <AbsoluteFill>
    <ParallaxLayer depth={1} image={backgroundImage} />
    <ParallaxLayer depth={2} image={characterImage} />
    <ParallaxLayer depth={3} image={effectImage} />
    <DialogueBubble /> (si hay diálogo, estilo manga)
    <Subtitles />
  </AbsoluteFill>
```

### DialogueBubble

```
Estilo de burbuja de diálogo manga:
  - Burbuja blanca con borde negro
  - Cola apuntando al personaje que habla
  - Texto en fuente manga (Noto Sans JP o similar)
  - Aparece con animación spring (crece desde 0)
  - Desaparece con fade out al terminar el diálogo

Variantes:
  - Normal: burbuja redondeada
  - Shout: burbuja con picos (como explosión)
  - Whisper: burbuja con borde punteado
  - Thought: burbuja de nube
  - Narration: caja rectangular en la esquina superior
```

### EndCard

```
Estructura:
  - Fondo oscuro con gradiente
  - Lista de 3-5 puntos clave aprendidos (aparecen secuencialmente)
  - Cada punto con icono de check animado
  - Teaser del próximo episodio (si existe)
  - Logo de AnimeLearn + "Generado por AI"
  - CTA si el episodio es público
```

---

## Timing y Ritmo

### Reglas de ritmo visual

```
1. NUNCA más de 5 segundos en el mismo panel sin cambio
   - Si el diálogo es largo, cambiar la expresión del personaje a mitad
   - O hacer zoom in/out sutil

2. Después de 3 paneles de diálogo seguidos → insertar panel de "respiro"
   - Panel panorámico del escenario
   - O panel de reacción sin diálogo (solo expresión)

3. El climax del episodio: romper el ritmo
   - Panel más largo de lo normal (5-6s)
   - O panel muy corto (1s) seguido de pausa negra
   - Música cambia abruptamente

4. Ritmo general por escena:
   - Panel setup (3s) → Paneles de desarrollo (2.5s c/u) → Panel de impacto (4s)
```

### Tabla de timing por tipo de panel

| Tipo de panel | Duración base | Con diálogo | Sin diálogo |
|---|---|---|---|
| Establishing shot | 3.0s | N/A | 3.0-4.0s |
| Diálogo normal | Variable | diálogo + 1.0s padding | N/A |
| Reacción | 2.0s | 2.0s | 1.5-2.0s |
| Acción | 1.5s | N/A | 1.5-2.5s |
| Revelación/impacto | 3.5s | diálogo + 1.5s | 3.5-5.0s |
| Transición ambiente | 2.0s | N/A | 2.0-3.0s |
| Panel final (cliffhanger) | 4.0s | diálogo + 2.0s | 4.0-5.0s |

---

## Ejemplo de Composición Completa

### Escenario: Episodio sobre "Qué es una Red Neuronal"

```
INTRO (5s)
  [Logo + "Episodio 1: La Chispa"]
  [Música: intro jingle 5s]

ESCENA 1: "El Descubrimiento" (45s, 4 paneles)
  Panel 1 (3.5s): Establishing shot
    - BG: Aula futurista, tarde soleada por la ventana
    - Parallax: slow_pan_right
    - Música: "ambient curiosity, soft synth pads, lo-fi"
    - Sin diálogo

  Panel 2 (4s): Introducción protagonista
    - BG: Mismo aula, zoom in
    - CHAR: Hana (protagonista) mirando una pantalla con expresión frustrada
    - Diálogo: "Llevo horas y este programa sigue sin reconocer gatos..."
    - Parallax: zoom_in suave
    - Burbuja: normal

  Panel 3 (3.5s): Aparición del mentor
    - BG: Mismo aula
    - CHAR: Profesor Tanaka aparece detrás, sonrisa enigmática
    - Diálogo: "¿Y si te dijera que un cerebro podría enseñarle?"
    - Parallax: static
    - Burbuja: normal

  Panel 4 (4s): Reacción
    - CHAR: Hana con ojos abiertos, expresión de curiosidad
    - Diálogo: "¿Un cerebro... dentro de un programa?"
    - Parallax: dramatic_zoom lento
    - Music direction: sube ligeramente la tensión
    - Transición: fade_black → siguiente escena

ESCENA 2: "La Neurona" (50s, 5 paneles)
  Panel 5 (4s): Visualización
    - BG: Espacio abstracto (interior de un cerebro estilizado, colores neón)
    - CHAR: Hana y Tanaka flotando en el espacio abstracto
    - Narración: "El profesor la llevó al mundo interior de la máquina"
    - Parallax: float
    - Música: "ethereal, wonder, soft electronic"

  Panel 6 (5s): Concepto clave
    - BG: Una neurona gigante brillante flotando
    - CHAR: Tanaka señalando la neurona
    - Diálogo Tanaka: "Esto es una neurona artificial. Recibe señales, las pesa y decide."
    - Parallax: zoom_in hacia la neurona
    - NOTA EDUCATIVA: Introduce concepto de neurona artificial

  [... continúa ...]

END CARD (15s)
  - "Hoy aprendiste:"
  - ✓ Una neurona artificial recibe inputs y produce un output
  - ✓ Los pesos determinan la importancia de cada input
  - ✓ La función de activación decide si la neurona "se enciende"
  - "Próximo episodio: La Red — Cuando las neuronas trabajan juntas"

OUTRO (5s)
  - Logo AnimeLearn
  - "Generado con AI a partir de tu contenido"
```

---

## Configuración de Render

### Especificaciones de output

```
Resolución: 1920×1080 (1080p)
FPS: 30
Codec: H.264
Formato: MP4
Bitrate: 8Mbps (calidad alta sin ser excesivo en tamaño)
Audio: AAC 192kbps stereo
Tamaño estimado: ~60MB por episodio de 4 minutos
```

### Configuración de Remotion Lambda

```
Región: eu-west-1 (o la más cercana al usuario)
Memory: 2048MB
Timeout: 300s (5 minutos — sobra para un episodio)
Concurrency: 1 render a la vez por usuario (evitar costes excesivos)
Storage: output directo a S3

Pre-render checklist:
  1. Todas las imágenes subidas a S3 y accesibles via URL
  2. Todos los audios subidos a S3 y accesibles via URL
  3. Timing calculado y verificado
  4. Composición validada en preview local
```

### Optimización de costes

```
Estrategias:
1. Cachear assets entre episodios de la misma serie
   - Character sheets: se generan una vez
   - Música de intro/outro: se reutiliza
   - Fondos recurrentes: se cachean

2. Preview antes de render final
   - Generar preview a 480p con pocos frames → validar
   - Solo si OK → render completo a 1080p

3. Render bajo demanda
   - No renderizar todos los episodios de una vez
   - Renderizar cuando el usuario los solicita
   - O renderizar el siguiente episodio en background mientras ve el actual
```
