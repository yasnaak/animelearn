# AnimeLearn — Guía de Implementación con Claude Code

## Índice

1. [Estrategia de Desarrollo con Claude Code](#estrategia-de-desarrollo-con-claude-code)
2. [Orden de Implementación](#orden-de-implementación)
3. [Sesiones de Trabajo Recomendadas](#sesiones-de-trabajo-recomendadas)
4. [Prompts para Claude Code por Tarea](#prompts-para-claude-code-por-tarea)
5. [Trampas Comunes y Cómo Evitarlas](#trampas-comunes-y-cómo-evitarlas)
6. [Testing del Pipeline](#testing-del-pipeline)
7. [Checklist de Lanzamiento](#checklist-de-lanzamiento)

---

## Estrategia de Desarrollo con Claude Code

### Principios para trabajar eficiente con Claude Code

```
1. UNA COSA A LA VEZ
   Claude Code trabaja mejor con tareas bien acotadas.
   "Implementa el servicio de extracción de PDF" > "Implementa todo el backend"

2. CONTEXTO ANTES DE CÓDIGO
   Siempre proporcionar el schema relevante, los tipos, y la estructura
   de archivos antes de pedir implementación.

3. TESTS COMO VERIFICACIÓN
   Pedir tests junto con la implementación. Claude Code puede correr
   los tests y corregir errores en la misma sesión.

4. ITERACIÓN VERTICAL
   No hacer todas las capas horizontalmente (todo el DB, luego todo el API,
   luego todo el frontend). En su lugar: implementar feature completa
   verticalmente (DB + API + UI del upload de PDF en una sesión).

5. ARCHIVOS DE REFERENCIA
   Mantener un archivo ARCHITECTURE.md en la raíz del proyecto que
   Claude Code pueda leer al inicio de cada sesión para tener contexto.
```

### Preparación del repositorio

Antes de empezar a implementar, crear estos archivos de referencia:

```
animelearn/
├── ARCHITECTURE.md          # Resumen de la arquitectura (dar a CC al inicio)
├── docs/
│   ├── prompt-system.md     # El documento de prompt engineering
│   ├── data-model.md        # Schema de DB
│   └── api-contracts.md     # Contratos de API
└── .cursorrules             # Si usas Cursor, reglas de contexto
    (o equivalente para CC)
```

---

## Orden de Implementación

### Fase 0: Setup (1 sesión de Claude Code)

```
Objetivo: proyecto funcionando con auth, DB y deploy básico.

Tareas:
  □ Crear proyecto Next.js con todas las dependencias
  □ Configurar Supabase (auth + DB)
  □ Configurar Drizzle ORM con el schema
  □ Ejecutar primera migración
  □ Setup tRPC con router básico
  □ Auth funcional (login con Google)
  □ Layout básico con sidebar
  □ Deploy inicial a Vercel

Resultado: puedes hacer login y ver un dashboard vacío.
```

### Fase 1: Ingesta (1-2 sesiones)

```
Objetivo: subir PDF o URL de YouTube y extraer texto.

Sesión 1A — Backend de ingesta:
  □ Servicio de extracción PDF (PyMuPDF via API o child_process)
  □ Servicio de extracción YouTube (yt-dlp + Whisper)
  □ Text chunker para contenidos largos
  □ tRPC route: project.create
  □ Upload de PDF a S3 via presigned URL
  □ Tests unitarios de extracción

Sesión 1B — Frontend de upload:
  □ Página /projects/new con formulario
  □ Componente UploadForm (drag & drop PDF + campo URL YouTube)
  □ Progress bar de upload
  □ Página /projects con lista de proyectos
  □ ProjectCard componente

Resultado: puedes subir un PDF o pegar URL, y ver el texto extraído.
```

### Fase 2: Motor de AI (2-3 sesiones)

```
Objetivo: dado un texto, generar análisis + plan + guión.

Sesión 2A — Wrapper de Claude API + Fase 1-2:
  □ Claude client con retry logic y error handling
  □ Implementar prompt de Fase 1 (análisis de contenido)
  □ Implementar prompt de Fase 2 (planificación de serie)
  □ Parseo y validación de JSON responses (con Zod)
  □ Almacenar resultados en DB (content_analysis, series_plan)
  □ Test: pasar un PDF real y verificar calidad del análisis

Sesión 2B — Fase 3 (Guionista):
  □ Implementar prompt de Fase 3 (generación de guión con Opus)
  □ Validador de guión (Fase QA)
  □ Almacenar guión en DB
  □ Test: generar guión completo de un episodio y revisar calidad
  □ Iterar el prompt hasta que la calidad narrativa sea buena

Sesión 2C — Fase 4-5 (Visual + Audio prompts):
  □ Implementar prompt de Fase 4 (prompts visuales)
  □ Implementar prompt de Fase 5 (dirección de audio)
  □ Tests de integración: contenido → análisis → plan → guión → prompts

Resultado: dado cualquier texto, obtienes un guión completo con
indicaciones visuales y de audio. Esto es ya un entregable de valor
(aunque sin video aún).
```

### Fase 3: Generación Visual (2-3 sesiones)

```
Objetivo: generar imágenes de paneles consistentes.

Sesión 3A — Character sheets:
  □ fal.ai client wrapper
  □ Generación de character sheet (multi-vista)
  □ Almacenamiento en S3
  □ Test: generar character sheet y evaluar consistencia

Sesión 3B — Paneles:
  □ Generación de fondos
  □ Generación de personajes con IP-Adapter
  □ Background removal (rembg)
  □ Composite de preview
  □ Batch processing
  □ Test: generar los 20 paneles de un episodio

Sesión 3C (si necesario) — Iteración de calidad:
  □ Ajustar prompts visuales basado en resultados
  □ Implementar validación automática de paneles
  □ Implementar regeneración con retry
  □ Optimizar consistencia de personajes

Resultado: episodio completo con todas las imágenes generadas.
```

### Fase 4: Audio (1-2 sesiones)

```
Objetivo: generar voces y música.

Sesión 4A — TTS + Música:
  □ ElevenLabs client wrapper
  □ Asignación de voces a personajes
  □ Generación de diálogos con emotion control
  □ Suno/Udio client para música
  □ Generación de tracks por mood
  □ Upload de todos los audios a S3
  □ Test: generar todo el audio de un episodio

Resultado: todos los assets de audio listos.
```

### Fase 5: Remotion (2-3 sesiones)

```
Objetivo: componer el video final.

Sesión 5A — Componentes base de Remotion:
  □ Setup Remotion en el proyecto
  □ Componente ParallaxLayer
  □ Componente Panel (composición de capas)
  □ Componente Transition (entre paneles y escenas)
  □ Preview funcional en Remotion Studio

Sesión 5B — Audio sync + render:
  □ Componente DialogueBubble
  □ Componente Subtitles
  □ Sincronización audio-visual
  □ Music ducking automático
  □ EndCard componente
  □ Render local funcional

Sesión 5C — Lambda + integración:
  □ Setup Remotion Lambda
  □ Trigger de render desde el backend
  □ Upload del video final a S3
  □ Test end-to-end: contenido → video

Resultado: primer video completo generado programáticamente.
```

### Fase 6: Orquestación (1-2 sesiones)

```
Objetivo: todo el pipeline conectado y automático.

Sesión 6A — Inngest workflow:
  □ Setup Inngest
  □ Implementar el workflow completo (generate-episode)
  □ Progress tracking en generation_jobs
  □ Error handling y retries
  □ Notificación al completar

Sesión 6B — UX de generación:
  □ GenerationProgress componente (realtime con Supabase)
  □ Página de episodio con VideoPlayer
  □ Toggle público/privado
  □ Página pública de episodio (watch/[episodeId])

Resultado: flujo completo funcional end-to-end.
```

### Fase 7: Monetización + Polish (1-2 sesiones)

```
Sesión 7A — Stripe:
  □ Planes de suscripción en Stripe
  □ Checkout flow
  □ Webhook handler
  □ Límites por plan
  □ PricingTable y UsageMeter componentes

Sesión 7B — Landing + Launch:
  □ Landing page con demo
  □ SEO básico + Open Graph
  □ Rate limiting
  □ Error pages
  □ Onboarding flow para nuevos usuarios
```

---

## Sesiones de Trabajo Recomendadas

### Template de prompt para iniciar sesión con Claude Code

```
Sesión de trabajo: [nombre de la sesión]

CONTEXTO:
Lee el archivo ARCHITECTURE.md para entender el proyecto.
Estamos trabajando en AnimeLearn, una plataforma SaaS que transforma
PDFs y videos de YouTube en episodios de motion comic estilo anime.

ESTADO ACTUAL:
- [Lo que ya está implementado]
- [Lo que falta]

OBJETIVO DE ESTA SESIÓN:
[Objetivo específico]

TAREAS:
1. [Tarea 1]
2. [Tarea 2]
3. [Tarea 3]

ARCHIVOS RELEVANTES:
- src/server/db/schema.ts (schema de DB)
- src/server/services/[servicio relevante]
- [otros archivos]

CRITERIOS DE COMPLETADO:
- [Tests que deben pasar]
- [Funcionalidad verificable]

RESTRICCIONES:
- Usar las dependencias ya instaladas (no añadir nuevas sin preguntar)
- Seguir los patrones establecidos en el código existente
- Manejar errores con try/catch y logging apropiado
- TypeScript strict mode
```

### Tips para sesiones productivas

```
1. MÁXIMO 3-4 archivos nuevos por sesión
   Más que eso y Claude Code pierde el hilo.

2. VERIFICAR ANTES DE AVANZAR
   Después de cada archivo, pedir que lo revise y testee.
   No acumular 10 archivos sin probar.

3. COPIAR TIPOS RELEVANTES AL PROMPT
   Si Claude Code va a usar types de otro archivo,
   copiar esos types al prompt en vez de asumir que los recuerda.

4. USAR ERRORES COMO FEEDBACK
   Si algo falla, copiar el error completo al chat.
   Claude Code es excelente resolviendo errores con contexto.

5. GUARDAR SESIONES EXITOSAS
   Si una sesión produjo buen código, referenciarlo
   en futuras sesiones como ejemplo de patrón a seguir.
```

---

## Prompts para Claude Code por Tarea

### Setup inicial del proyecto

```
Crea un nuevo proyecto Next.js 14 con App Router para AnimeLearn.

Stack:
- Next.js 14 con TypeScript strict
- Tailwind CSS + shadcn/ui
- tRPC v11 para API type-safe
- Drizzle ORM con PostgreSQL (Supabase)
- Supabase Auth (Google + GitHub providers)

Estructura de carpetas: [pegar estructura del doc 02]

Para esta sesión, implementa solo:
1. El scaffolding del proyecto con todas las dependencias
2. La configuración de tRPC (server + client)
3. La configuración de Drizzle con el schema completo
4. El middleware de auth con Supabase
5. Un layout básico con sidebar

No implementes lógica de negocio aún.
El objetivo es que `npm run dev` funcione y puedas hacer login.
```

### Implementar un servicio

```
Implementa el servicio de extracción de texto de PDF.

Archivo: src/server/services/ingestion/pdf-extractor.ts

Requisitos:
- Recibe un Buffer o URL de S3 de un archivo PDF
- Extrae todo el texto manteniendo estructura de párrafos
- Detecta y preserva headings/títulos
- Maneja PDFs de hasta 500 páginas
- Devuelve un objeto con: rawText, pageCount, estimatedWordCount, structure
- Usa PyMuPDF (pymupdf) via child_process o una librería JS equivalente
- Error handling robusto: PDFs corruptos, protegidos, escaneados (sin texto)
- Para PDFs escaneados, devolver error específico sugiriendo OCR

Types esperados:
[pegar los types relevantes]

Tests:
- Crear test con un PDF de ejemplo
- Verificar extracción correcta de texto
- Verificar manejo de errores
```

### Implementar un prompt del pipeline

```
Implementa la Fase 1 del pipeline de prompts: Análisis de Contenido.

Archivos:
- src/server/services/ai/claude-client.ts (wrapper reutilizable)
- src/server/services/ai/prompts/content-analysis.ts

El system prompt y el output schema están definidos aquí:
[pegar sección relevante del doc 01]

Requisitos del claude-client.ts:
- Wrapper sobre @anthropic-ai/sdk
- Retry con exponential backoff (máx 3 intentos)
- Timeout configurable (default 120s para Opus, 60s para Sonnet)
- Parseo de JSON response con validación Zod
- Logging de tokens usados y latencia
- Manejo de rate limits (429)

Requisitos del content-analysis.ts:
- Función analyzeContent(rawText: string): Promise<ContentAnalysis>
- Usa el claude-client con modelo Sonnet
- Valida el JSON response contra el Zod schema
- Si el contenido es >10K tokens, divide en chunks y consolida
- Almacena resultado en DB (campo content_analysis del proyecto)

Zod schema para validación:
[generar Zod schema basado en el JSON schema del doc 01]
```

---

## Trampas Comunes y Cómo Evitarlas

### 1. Timeout en generación de imágenes

```
Problema: fal.ai puede tardar 10-30s por imagen. Con 60 imágenes
por episodio, son 10+ minutos solo de generación de imágenes.

Solución:
- NUNCA hacer await secuencial de todas las imágenes
- Usar Promise.allSettled con concurrency limitada (5-10 simultáneas)
- Implementar con p-limit o similar
- Cada imagen con su propio timeout (45s) y retry (2 intentos)
```

### 2. JSON malformado de Claude

```
Problema: a veces Claude devuelve JSON con markdown fences,
texto extra antes/después, o JSON inválido.

Solución:
- Extraer JSON con regex: /\{[\s\S]*\}/ o /\[[\s\S]*\]/
- Intentar JSON.parse
- Si falla: reintentar con prompt más estricto
- Validar siempre con Zod
- Logging del response raw para debugging
```

### 3. Costes descontrolados

```
Problema: un bug en un loop puede generar 1000 imágenes en vez de 20.

Solución:
- Rate limiting por usuario Y por episodio
- Máximo de API calls por generación de episodio (hardcoded):
  - Claude: máx 10 calls
  - fal.ai: máx 100 images
  - ElevenLabs: máx 50 requests
  - Suno: máx 10 tracks
- Billing alerts en todos los providers
- Kill switch manual para detener toda generación
```

### 4. Remotion Lambda failures

```
Problema: Lambda timeout, out of memory, o archivos no accesibles.

Solución:
- Pre-validar que TODOS los assets (imágenes, audio) son accesibles
  via URL antes de iniciar el render
- Usar presigned URLs de S3 con expiración larga (1 hora)
- Render con timeout generoso (5 min)
- Si falla: reintentar 1 vez con más memoria
- Si falla 2: generar video degradado (sin parallax, solo slideshow)
```

### 5. Supabase Realtime disconnections

```
Problema: el frontend pierde la conexión realtime y no ve progreso.

Solución:
- Implementar reconnection logic con backoff
- Polling como fallback (cada 5s) si realtime no conecta
- Persistir último estado conocido en el componente
- Botón manual de "refrescar estado" como último recurso
```

---

## Testing del Pipeline

### Script de test manual

```
Crear: scripts/test-pipeline.ts

Este script permite testear cada fase del pipeline de forma aislada
o ejecutar el pipeline completo.

Uso:
  npx tsx scripts/test-pipeline.ts --phase 1 --input ./test-data/sample.pdf
  npx tsx scripts/test-pipeline.ts --phase 3 --input ./test-data/analysis.json
  npx tsx scripts/test-pipeline.ts --full --input ./test-data/sample.pdf

Cada fase guarda su output en ./test-outputs/ para inspección manual.
```

### Datos de test recomendados

```
Preparar 3 PDFs de test de complejidad creciente:

1. test-simple.pdf (2-3 páginas)
   Tema: "Qué es una variable en programación"
   Esperado: 1 episodio, 2 conceptos, guión simple

2. test-medium.pdf (10-15 páginas)
   Tema: "Introducción a Machine Learning"
   Esperado: 3-4 episodios, 8-10 conceptos, narrativa compleja

3. test-complex.pdf (30+ páginas)
   Tema: Capítulo de un libro de texto universitario
   Esperado: 5-7 episodios, 15+ conceptos, chunking necesario

Y 1 URL de YouTube:
4. Video educativo de 10-15 minutos (ej: 3Blue1Brown o Veritasium)
   Esperado: 2-3 episodios del video transcrito
```

---

## Checklist de Lanzamiento

### Pre-beta

```
Funcionalidad:
  □ Upload PDF funciona (hasta 50MB, hasta 500 páginas)
  □ YouTube URL funciona (hasta 60 min de video)
  □ Pipeline completo genera video en <15 minutos
  □ Video se ve bien en desktop y móvil
  □ Subtítulos sincronizados correctamente
  □ Audio: diálogos se escuchan claros sobre la música
  □ Compartir episodio públicamente funciona
  □ Descargar MP4 funciona

Calidad:
  □ Personajes reconocibles entre paneles (>80% consistencia)
  □ Guión cubre todos los conceptos del input
  □ No hay errores factuales en el contenido generado
  □ El ritmo se siente natural (no demasiado rápido ni lento)

Infraestructura:
  □ Auth funcional (Google + GitHub)
  □ Stripe configurado con planes de pricing
  □ Rate limiting activo
  □ Error tracking (Sentry) configurado
  □ Analytics (Posthog) configurado
  □ Backups de DB configurados
  □ Alertas de billing en todos los providers

Seguridad:
  □ API keys en env vars (no en código)
  □ CORS configurado correctamente
  □ Rate limiting por usuario
  □ Validación de input en todos los endpoints
  □ Presigned URLs con expiración

Legal:
  □ Terms of Service (el usuario es responsable del copyright del input)
  □ Privacy Policy
  □ Cookie banner si necesario
```

### Para el día del lanzamiento beta

```
  □ 3-5 episodios de ejemplo pre-generados como demo
  □ Landing page con video de ejemplo embebido
  □ Email de bienvenida configurado
  □ 20-30 invitaciones para beta cerrada enviadas a creadores
  □ Post preparado para Twitter/Reddit con episodio de ejemplo
  □ Monitoring dashboard abierto para seguir métricas en tiempo real
  □ Plan de respuesta rápida si algo falla (rollback, kill switch)
```
