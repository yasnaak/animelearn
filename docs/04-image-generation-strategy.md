# AnimeLearn — Estrategia de Generación de Imágenes

## Índice

1. [El Problema Central: Consistencia](#el-problema-central-consistencia)
2. [Stack de Generación](#stack-de-generación)
3. [Character Sheets](#character-sheets)
4. [Generación de Paneles](#generación-de-paneles)
5. [Separación de Capas](#separación-de-capas)
6. [Estilos Visuales](#estilos-visuales)
7. [Pipeline de Calidad](#pipeline-de-calidad)
8. [Optimización de Costes](#optimización-de-costes)
9. [Fallbacks y Planes B](#fallbacks-y-planes-b)

---

## El Problema Central: Consistencia

El mayor desafío técnico de AnimeLearn no es generar imágenes bonitas — es que **el mismo personaje se vea igual en 20 paneles distintos**. Esto es lo que rompe o hace el producto.

### Estado del arte (marzo 2026)

- **IP-Adapter**: Mantiene identidad de personaje usando imagen de referencia. Funciona bien para caras, pierde consistencia en cuerpo/ropa en poses extremas.
- **Character LoRAs**: Entrenamiento fine-tuned por personaje. Mejor consistencia pero requiere ~20 imágenes de training y 15-30 min de entrenamiento. No viable para generación en tiempo real.
- **InstantID / PhotoMaker**: Diseñados para personas reales, no ideales para anime.
- **Referencia multi-imagen**: Flux y SDXL aceptan múltiples imágenes de referencia. Con 4-6 vistas del character sheet, la consistencia mejora significativamente.

### Nuestra estrategia

```
Estrategia híbrida en 3 niveles:

Nivel 1 (MVP): IP-Adapter + character sheet multi-vista
  → Suficiente para lanzar. ~80% consistencia.
  → Las inconsistencias menores se disimulan con el estilo motion comic.

Nivel 2 (post-validación): LoRAs pre-entrenados por estilo
  → Entrenar LoRAs base para cada estilo (clean_modern, soft_pastel, etc.)
  → Los personajes se adaptan al LoRA de estilo, mejorando consistencia.

Nivel 3 (escala): LoRAs por personaje bajo demanda
  → Para series largas (>5 episodios), entrenar LoRA específico del personaje.
  → Caching del LoRA para reutilización.
```

---

## Stack de Generación

### Proveedor principal: fal.ai

```
Por qué fal.ai:
- API rápida y estable
- Soporte nativo para Flux, SDXL, IP-Adapter
- Pricing competitivo (~$0.02/imagen)
- Endpoints de batch para generar múltiples imágenes
- rembg integrado para background removal
- Buen uptime y SDKs actualizados

Alternativas evaluadas:
- Replicate: viable, ligeramente más caro, más modelos disponibles
- Together.ai: más barato pero menos features de IP-Adapter
- RunPod: más control pero requiere gestionar infra propia
- ComfyUI self-hosted: máximo control, complejidad de ops

Decisión: fal.ai para MVP, evaluar ComfyUI self-hosted cuando
el volumen justifique los costes fijos de GPU.
```

### Modelo principal: Flux Dev / Flux Pro

```
Flux Dev:
  - Calidad alta para anime con prompts bien hechos
  - Más rápido que Flux Pro
  - ~$0.015/imagen
  - Bueno para paneles de fondo y escenas simples

Flux Pro:
  - Mejor adherencia a prompts complejos
  - Mejor para escenas con múltiples personajes
  - ~$0.025/imagen
  - Usar para paneles climáticos o con interacción entre personajes

Estrategia: Flux Dev por defecto, Flux Pro para paneles marcados como
"high_importance" en el guión (climax, revelaciones, primer panel).
```

---

## Character Sheets

### Proceso de generación

```
Paso 1: Generar vista principal (frontal)
  Prompt template:
  "anime character design, {style}, front view, full body,
   {visual_description}, white background, clean line art,
   detailed outfit, cel shading, high quality, no background"

  Negative: "blurry, low quality, realistic, 3d, multiple characters,
   extra limbs, deformed, bad anatomy, text, watermark"

  Generar 4 variantes → seleccionar la mejor (o dejar al usuario elegir)

Paso 2: Generar vistas adicionales usando la frontal como referencia
  - 3/4 view (IP-Adapter con imagen frontal como referencia)
  - Side profile
  - Back view

Paso 3: Generar expresiones (usando vista frontal como referencia)
  - Neutral / Happy / Angry / Surprised / Sad / Determined
  - Solo cara, mismo estilo, misma iluminación

Paso 4: Componer el character sheet final
  - Grid de 2×4 o 3×3 con todas las vistas y expresiones
  - Guardar tanto el composite como cada imagen individual
  - Las individuales se usan como referencia para paneles específicos

Output almacenado en S3:
  characters/{charId}/sheet_composite.png
  characters/{charId}/front.png
  characters/{charId}/three_quarter.png
  characters/{charId}/side.png
  characters/{charId}/expr_happy.png
  characters/{charId}/expr_angry.png
  (etc.)
```

### Selección de voz visual

Para el MVP, ofrecer 4 estilos de personaje base:

```
Estilo "Shonen Hero": pelo puntiagudo, ojos grandes, expresión determinada
Estilo "Calm Mentor": pelo ordenado, ojos entrecerrados, sonrisa leve
Estilo "Energetic Support": pelo colorido, ojos brillantes, pose dinámica
Estilo "Cool Rival": pelo oscuro, ojos afilados, expresión seria
```

Estos arquetipos se combinan con la descripción del guionista para generar personajes únicos pero con bases probadas de consistencia.

---

## Generación de Paneles

### Flujo por panel

```
Input por panel:
  - visual_description (del guión, Fase 3)
  - characters_in_panel (IDs, posiciones, expresiones)
  - background description
  - layout (full_page, closeup, widescreen, etc.)
  - mood/lighting

Paso 1: Generar fondo
  Prompt: "{style} anime background, {background_description},
           {time_of_day} lighting, {weather}, {mood},
           no characters, empty scene, detailed environment"
  → Output: background_{panelId}.png

Paso 2: Generar capa de personajes
  Para cada personaje en el panel:
    - Seleccionar la vista de referencia más cercana a la pose deseada
    - Usar IP-Adapter con esa referencia
    - Prompt: "{style} anime character, {pose_description},
               {expression}, {outfit_details},
               transparent background, isolated character"
    - Si hay múltiples personajes: generar por separado y componer
  → Output: characters_{panelId}.png

Paso 3: Generar efectos (si aplica)
  - Partículas, rayos de luz, humo, auras, speedlines
  - Prompt específico del efecto con fondo transparente
  → Output: effects_{panelId}.png

Paso 4: Generar composite de preview
  - Combinar las 3 capas con Pillow/Sharp para preview rápido
  - El composite final se hace en Remotion con parallax
  → Output: preview_{panelId}.png
```

### Aspect Ratios por tipo de layout

```
full_page:    16:9 (1920×1080)  — escena completa
half_page:    16:9 (1920×1080)  — dos paneles lado a lado (cada uno 960×1080)
widescreen:   21:9 (1920×823)   — panorámica, paisajes
closeup:      1:1  (1080×1080)  — primer plano de rostro
vertical:     9:16 (1080×1920)  — panel vertical, caídas, altura

Nota: todos se renderizan dentro del canvas 1920×1080 de Remotion.
Los aspect ratios no estándar se matizan con barras negras o fondos.
```

### Handling de múltiples personajes

```
Problema: generar 2+ personajes en la misma imagen con IP-Adapter
es inconsistente. Los modelos tienden a mezclar features.

Solución:
  1. Generar cada personaje por separado con fondo transparente
  2. Usar rembg para asegurar transparencia limpia
  3. Componer en la posición correcta via código
  4. Añadir sombras de contacto para coherencia visual

Limitación conocida: la interacción física entre personajes
(ej: darse la mano) es difícil de lograr con esta técnica.
Mitigación: diseñar paneles donde los personajes estén cerca
pero sin contacto directo. Reservar contacto físico para paneles
donde se genera la escena completa sin IP-Adapter (aceptando
menor consistencia a cambio de interacción natural).
```

---

## Separación de Capas

### Técnica de separación

```
Para el efecto parallax necesitamos capas separadas. Dos enfoques:

Enfoque A: Generar capas por separado (recomendado para MVP)
  - Generar fondo sin personajes
  - Generar personajes con fondo transparente
  - Componer en Remotion con profundidad
  
  Ventaja: control total sobre cada capa
  Desventaja: posible incoherencia de iluminación entre capas

Enfoque B: Generar imagen completa + separar con AI
  - Generar panel completo con personajes y fondo
  - Usar modelo de segmentación (SAM, rembg) para separar
  - Inpainting para rellenar el fondo detrás del personaje
  
  Ventaja: iluminación coherente
  Desventaja: artefactos en bordes, inpainting imperfecto

Decisión MVP: Enfoque A. Es más predecible y Claude Code puede
automatizarlo sin debugging visual complejo.
```

### Mapa de profundidad

```
Para cada panel, definir z-index de cada elemento:

z: 0   — Cielo / fondo lejano (se mueve muy lento o estático)
z: 10  — Edificios / montañas lejanas
z: 20  — Árboles / elementos medios
z: 30  — Suelo / superficie
z: 40  — Personajes secundarios
z: 50  — Personaje principal
z: 60  — Objetos en primer plano (mesas, barandillas)
z: 70  — Efectos (partículas, humo)
z: 80  — Burbujas de diálogo
z: 90  — Subtítulos
z: 100 — UI overlay
```

---

## Estilos Visuales

### Estilos disponibles en MVP

#### 1. Clean Modern (`clean_modern`)
```
Referencia visual: Spy x Family, Jujutsu Kaisen
Características:
  - Líneas limpias y definidas
  - Colores vibrantes y saturados
  - Sombras nítidas (hard shadow)
  - Fondos detallados
  - Cel shading marcado

Prompt modifiers:
  "clean line art, vibrant colors, modern anime style, cel shading,
   sharp shadows, detailed background, high contrast, crisp lines"

Mejor para: contenido técnico, programación, ciencias exactas
```

#### 2. Soft Pastel (`soft_pastel`)
```
Referencia visual: Violet Evergarden, Your Name
Características:
  - Tonos pastel y suaves
  - Iluminación cálida y difusa
  - Sombras graduales (soft shadow)
  - Fondos atmosféricos
  - Nivel de detalle alto

Prompt modifiers:
  "soft pastel colors, warm lighting, atmospheric, soft shadows,
   gentle gradients, dreamy, watercolor influence, beautiful scenery"

Mejor para: humanidades, filosofía, literatura, psicología
```

#### 3. Dark Dramatic (`dark_dramatic`)
```
Referencia visual: Attack on Titan, Death Note
Características:
  - Paleta oscura con acentos de color intensos
  - Alto contraste
  - Sombras profundas
  - Iluminación dramática (contraluz frecuente)
  - Texturas grunge sutiles

Prompt modifiers:
  "dark atmosphere, dramatic lighting, high contrast, deep shadows,
   intense colors, moody, cinematic, heavy shading, backlit"

Mejor para: historia, conflictos, economía, temas serios
```

#### 4. Retro Classic (`retro_classic`)
```
Referencia visual: Cowboy Bebop, Evangelion
Características:
  - Paleta limitada y nostálgica
  - Líneas más gruesas
  - Menos detalle pero más expresividad
  - Grain/noise sutil
  - Composiciones más cinemáticas

Prompt modifiers:
  "90s anime style, retro anime, limited color palette, thick outlines,
   film grain, expressive, classic cel animation look, nostalgic"

Mejor para: música, arte, cultura pop, sociología
```

### Consistencia de estilo intra-serie

```
Regla: una vez elegido el estilo de una serie, TODOS los paneles
usan el mismo prompt modifier base. No mezclar estilos dentro de
una serie.

Excepción: flashbacks o escenas de sueño pueden usar temporalmente
un estilo diferente (ej: soft_pastel para un recuerdo dentro de
una serie dark_dramatic). Esto se marca explícitamente en el guión.
```

---

## Pipeline de Calidad

### Validación automática por panel

```
Después de generar cada panel, ejecutar estas verificaciones:

1. Resolución: ¿cumple el aspect ratio esperado?
2. NSFW check: filtro de seguridad (fal.ai incluye uno)
3. Detección de artefactos:
   - Dedos deformes (detector dedicado)
   - Texto ilegible generado por el modelo
   - Caras duplicadas o deformes
4. Consistencia de color: paleta del panel dentro del rango del estilo
5. Composition check: ¿hay contenido visual en las áreas esperadas?

Si falla cualquier check:
  → Regenerar con seed diferente (máximo 3 intentos)
  → Si falla 3 veces: marcar para revisión manual + usar mejor intento
```

### A/B testing de calidad

```
Para los primeros 100 usuarios beta:
  - Generar 2 variantes de cada panel
  - Mostrar ambas y dejar que el usuario elija
  - Trackear preferencias para optimizar prompts
  - Después de suficientes datos: automatizar la selección
```

---

## Optimización de Costes

### Caching agresivo

```
Nivel 1: Character sheets
  - Se generan UNA vez por serie
  - Se reutilizan en todos los episodios
  - Ahorro: ~$0.12 × (episodios - 1)

Nivel 2: Fondos recurrentes
  - Si el guión repite una localización (ej: "el aula"), generar una vez
  - Reutilizar con variaciones de iluminación (time_of_day)
  - El guionista marca "LOCATION_REUSE: aula" en el JSON
  - Ahorro: ~30% de los fondos de una serie

Nivel 3: Expresiones
  - Un personaje tiene ~6 expresiones base
  - Para paneles de reacción, usar la expresión pre-generada
  - Solo generar imagen nueva si la pose es diferente
  - Ahorro: ~20% de las imágenes de personaje

Total estimado de ahorro: 30-40% del coste de imágenes
para series de 3+ episodios.
```

### Batch processing

```
fal.ai soporta batch requests. En vez de hacer 20 llamadas secuenciales
para 20 paneles, hacer 1 batch request.

Beneficios:
  - Menor latencia total (~40% reducción)
  - Potencialmente menor coste por imagen
  - Menos overhead de red

Implementación: agrupar todos los prompts de fondo,
luego todos los de personajes, luego todos los de efectos.
3 batch requests en vez de 60 requests individuales.
```

---

## Fallbacks y Planes B

### Si IP-Adapter no mantiene consistencia suficiente

```
Plan B: Workflow de ComfyUI más complejo
  - Usar ControlNet con pose estimation
  - Combinar con IP-Adapter en pesos más altos
  - Trade-off: más lento pero más consistente
  - Requiere self-hosting (RunPod o GPU propia)

Plan C: Reducir variedad de poses
  - Limitar a 4-5 poses base por personaje
  - Cada pose se pre-genera con alta consistencia
  - Las escenas se adaptan a las poses disponibles
  - Menos dinámico pero más consistente

Plan D: Estilo simplificado
  - Cambiar a estilo chibi (SD, cabezón)
  - Mucho más fácil de mantener consistente
  - Pierde seriedad pero gana en "cute factor"
  - Podría ser un estilo adicional, no el principal
```

### Si fal.ai tiene problemas de disponibilidad

```
Failover chain:
  1. fal.ai (principal)
  2. Replicate (mismo modelo Flux, diferente infra)
  3. Together.ai (SDXL como fallback, menor calidad anime)

Implementación: interfaz abstracta ImageGenerator con implementaciones
intercambiables. Cambio de proveedor = cambio de 1 línea de config.
```

### Si el coste de imágenes es demasiado alto

```
Optimización agresiva:
  1. Reducir paneles por episodio: 20 → 12-15
  2. Más paneles de "reacción" (reutilizar assets)
  3. Paneles de texto over fondo (para datos/definiciones)
  4. Reducir capas: solo 2 (fondo + personaje, sin efectos)
  5. Self-hosting con GPU dedicada si el volumen lo justifica
     Break-even estimado: ~500 episodios/mes → GPU propia compensa
```
