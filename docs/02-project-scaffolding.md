# AnimeLearn — Scaffolding del Proyecto

## Índice

1. [Estructura del Proyecto](#estructura-del-proyecto)
2. [Configuración Inicial](#configuración-inicial)
3. [Modelo de Datos](#modelo-de-datos)
4. [API Routes](#api-routes)
5. [Pipeline de Generación con Inngest](#pipeline-de-generación-con-inngest)
6. [Integraciones Externas](#integraciones-externas)
7. [Variables de Entorno](#variables-de-entorno)
8. [Comandos de Desarrollo](#comandos-de-desarrollo)

---

## Estructura del Proyecto

```
animelearn/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx            # Dashboard layout con sidebar
│   │   │   ├── page.tsx              # Home — lista de proyectos
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx          # Lista de proyectos
│   │   │   │   ├── new/page.tsx      # Crear proyecto (upload PDF / YouTube URL)
│   │   │   │   └── [projectId]/
│   │   │   │       ├── page.tsx      # Vista del proyecto con episodios
│   │   │   │       └── episodes/
│   │   │   │           └── [episodeId]/
│   │   │   │               └── page.tsx  # Player del episodio
│   │   │   └── settings/
│   │   │       └── page.tsx          # Config usuario + billing
│   │   ├── (public)/
│   │   │   ├── page.tsx              # Landing page
│   │   │   └── watch/[episodeId]/
│   │   │       └── page.tsx          # Player público (compartir)
│   │   ├── api/
│   │   │   ├── inngest/route.ts      # Inngest webhook handler
│   │   │   ├── trpc/[trpc]/route.ts  # tRPC handler
│   │   │   ├── webhooks/
│   │   │   │   └── stripe/route.ts   # Stripe webhooks
│   │   │   └── upload/route.ts       # Presigned URL para uploads
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── server/                        # Backend logic
│   │   ├── trpc/
│   │   │   ├── router.ts             # Root router
│   │   │   ├── context.ts            # tRPC context con auth
│   │   │   └── routers/
│   │   │       ├── project.ts        # CRUD proyectos
│   │   │       ├── episode.ts        # CRUD episodios
│   │   │       ├── generation.ts     # Trigger + status de generación
│   │   │       └── billing.ts        # Suscripción + créditos
│   │   ├── db/
│   │   │   ├── schema.ts             # Drizzle ORM schema
│   │   │   ├── migrations/           # Migraciones auto-generadas
│   │   │   └── index.ts              # DB client
│   │   └── services/
│   │       ├── ingestion/
│   │       │   ├── pdf-extractor.ts   # PyMuPDF via child_process o API
│   │       │   ├── youtube-extractor.ts # yt-dlp + Whisper
│   │       │   └── text-chunker.ts    # Dividir textos largos
│   │       ├── ai/
│   │       │   ├── claude-client.ts   # Wrapper Claude API
│   │       │   ├── prompts/
│   │       │   │   ├── content-analysis.ts    # Fase 1
│   │       │   │   ├── series-planning.ts     # Fase 2
│   │       │   │   ├── script-generation.ts   # Fase 3
│   │       │   │   ├── visual-prompts.ts      # Fase 4
│   │       │   │   └── audio-direction.ts     # Fase 5
│   │       │   └── validators/
│   │       │       └── script-validator.ts    # QA post-generación
│   │       ├── image/
│   │       │   ├── fal-client.ts       # fal.ai para Flux/SDXL
│   │       │   ├── character-sheet.ts  # Generación de character sheets
│   │       │   ├── panel-generator.ts  # Generación de paneles
│   │       │   └── layer-separator.ts  # Separar fondo/personaje/efectos
│   │       ├── audio/
│   │       │   ├── elevenlabs-client.ts # TTS
│   │       │   ├── suno-client.ts       # Música
│   │       │   └── audio-mixer.ts       # Combinar diálogo + música + sfx
│   │       ├── video/
│   │       │   ├── remotion-config.ts   # Config Remotion
│   │       │   ├── scene-builder.ts     # Construir composición por escena
│   │       │   └── render-trigger.ts    # Trigger render en Lambda
│   │       └── storage/
│   │           ├── s3-client.ts         # Upload/download S3
│   │           └── cdn-urls.ts          # Generar URLs de CloudFront
│   │
│   ├── inngest/                        # Workflows de generación
│   │   ├── client.ts                   # Inngest client
│   │   └── functions/
│   │       ├── generate-episode.ts     # Workflow principal
│   │       ├── steps/
│   │       │   ├── ingest-content.ts
│   │       │   ├── analyze-content.ts
│   │       │   ├── plan-series.ts
│   │       │   ├── generate-script.ts
│   │       │   ├── generate-characters.ts
│   │       │   ├── generate-panels.ts
│   │       │   ├── generate-audio.ts
│   │       │   ├── compose-video.ts
│   │       │   └── deliver-episode.ts
│   │       └── on-generation-failed.ts  # Error handler
│   │
│   ├── remotion/                       # Composición de video
│   │   ├── Root.tsx                    # Entry point Remotion
│   │   ├── compositions/
│   │   │   └── Episode.tsx             # Composición principal
│   │   ├── components/
│   │   │   ├── Panel.tsx               # Panel con parallax
│   │   │   ├── DialogueBubble.tsx      # Burbuja de diálogo
│   │   │   ├── Transition.tsx          # Transiciones entre escenas
│   │   │   ├── Subtitles.tsx           # Subtítulos sincronizados
│   │   │   ├── ParallaxLayer.tsx       # Capa con movimiento parallax
│   │   │   └── EndCard.tsx             # Tarjeta final con resumen
│   │   ├── hooks/
│   │   │   └── useAudioSync.ts         # Sincronizar visual con audio
│   │   └── utils/
│   │       ├── timing.ts               # Cálculos de timing
│   │       └── easing.ts               # Curvas de animación
│   │
│   ├── components/                     # Componentes UI compartidos
│   │   ├── ui/                         # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── project/
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── UploadForm.tsx
│   │   │   └── GenerationProgress.tsx  # Barra de progreso en tiempo real
│   │   ├── episode/
│   │   │   ├── EpisodeCard.tsx
│   │   │   ├── VideoPlayer.tsx
│   │   │   └── EpisodeList.tsx
│   │   └── billing/
│   │       ├── PricingTable.tsx
│   │       └── UsageMeter.tsx
│   │
│   ├── lib/                            # Utilidades compartidas
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser client
│   │   │   ├── server.ts               # Server client
│   │   │   └── middleware.ts            # Auth middleware
│   │   ├── stripe/
│   │   │   └── client.ts
│   │   ├── utils.ts                    # cn(), formatters, etc.
│   │   └── constants.ts                # Límites de plan, config
│   │
│   └── types/                          # TypeScript types
│       ├── database.ts                 # Types generados de Drizzle
│       ├── generation.ts               # Types del pipeline
│       ├── api.ts                      # Types de API responses
│       └── remotion.ts                 # Types de composición
│
├── public/
│   ├── fonts/
│   └── images/
│
├── scripts/
│   ├── seed-db.ts                      # Seed data de desarrollo
│   └── test-pipeline.ts                # Test manual del pipeline
│
├── .env.local                          # Variables de entorno
├── .env.example                        # Template de env vars
├── drizzle.config.ts                   # Config Drizzle ORM
├── inngest.config.ts                   # Config Inngest
├── remotion.config.ts                  # Config Remotion
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Configuración Inicial

### Dependencias principales

```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "@trpc/server": "^11",
    "@trpc/client": "^11",
    "@trpc/react-query": "^11",
    "@tanstack/react-query": "^5",
    "drizzle-orm": "^0.35",
    "inngest": "^3",
    "@remotion/core": "^4",
    "@remotion/cli": "^4",
    "@remotion/lambda": "^4",
    "@supabase/supabase-js": "^2",
    "@supabase/ssr": "^0.5",
    "@anthropic-ai/sdk": "^0.30",
    "@fal-ai/client": "^1",
    "elevenlabs": "^0.15",
    "stripe": "^17",
    "@aws-sdk/client-s3": "^3",
    "@aws-sdk/cloudfront-signer": "^3",
    "tailwindcss": "^3.4",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "lucide-react": "^0.400",
    "zod": "^3.23"
  },
  "devDependencies": {
    "typescript": "^5.5",
    "drizzle-kit": "^0.25",
    "@types/react": "^18",
    "@types/node": "^22",
    "eslint": "^9",
    "prettier": "^3"
  }
}
```

### Comando de setup para Claude Code

```bash
# Crear proyecto
npx create-next-app@latest animelearn --typescript --tailwind --eslint --app --src-dir

# Instalar dependencias core
npm install @trpc/server @trpc/client @trpc/react-query @tanstack/react-query
npm install drizzle-orm inngest @supabase/supabase-js @supabase/ssr
npm install @anthropic-ai/sdk @fal-ai/client stripe zod
npm install @aws-sdk/client-s3 @aws-sdk/cloudfront-signer

# Instalar Remotion
npm install @remotion/core @remotion/cli @remotion/lambda @remotion/player

# Instalar UI
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input label tabs dialog progress toast

# Dev dependencies
npm install -D drizzle-kit
```

---

## Modelo de Datos

### Schema Drizzle ORM

```typescript
// src/server/db/schema.ts

import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum, boolean } from 'drizzle-orm/pg-core';

// === ENUMS ===

export const projectStatusEnum = pgEnum('project_status', [
  'draft',          // Contenido subido, no procesado
  'analyzing',      // Fase 1-2 en curso
  'planned',        // Serie planificada, lista para generar episodios
  'generating',     // Al menos un episodio en generación
  'completed',      // Todos los episodios generados
  'failed'          // Error en algún paso
]);

export const episodeStatusEnum = pgEnum('episode_status', [
  'planned',        // En el plan pero no generado
  'script',         // Guión generado
  'visuals',        // Paneles generados
  'audio',          // Audio generado
  'composing',      // Remotion renderizando
  'ready',          // Episodio listo
  'failed'
]);

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'free', 'creator', 'pro'
]);

export const sourceTypeEnum = pgEnum('source_type', [
  'pdf', 'youtube'
]);

// === TABLAS ===

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  authId: text('auth_id').notNull().unique(),          // Supabase auth ID
  email: text('email').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  tier: subscriptionTierEnum('tier').notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  episodesUsedThisMonth: integer('episodes_used_this_month').notNull().default(0),
  extraCredits: integer('extra_credits').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  status: projectStatusEnum('status').notNull().default('draft'),
  sourceType: sourceTypeEnum('source_type').notNull(),
  sourceUrl: text('source_url'),                        // YouTube URL o S3 key del PDF
  rawContent: text('raw_content'),                      // Texto extraído
  contentAnalysis: jsonb('content_analysis'),            // Output Fase 1
  seriesPlan: jsonb('series_plan'),                      // Output Fase 2
  style: text('style').notNull().default('clean_modern'), // Estilo visual
  language: text('language').notNull().default('es'),
  totalEpisodes: integer('total_episodes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  role: text('role').notNull(),                         // protagonist, mentor, etc.
  visualDescription: text('visual_description').notNull(),
  characterSheetUrl: text('character_sheet_url'),        // S3 URL del character sheet
  voiceId: text('voice_id'),                             // ElevenLabs voice ID
  personality: jsonb('personality'),                     // traits, catchphrase, etc.
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const episodes = pgTable('episodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  episodeNumber: integer('episode_number').notNull(),
  title: text('title').notNull(),
  status: episodeStatusEnum('status').notNull().default('planned'),
  synopsis: text('synopsis'),
  script: jsonb('script'),                               // Output Fase 3 completo
  visualPrompts: jsonb('visual_prompts'),                 // Output Fase 4
  audioDirection: jsonb('audio_direction'),                // Output Fase 5
  videoUrl: text('video_url'),                            // S3/CloudFront URL del video final
  subtitlesUrl: text('subtitles_url'),                    // URL archivo SRT/VTT
  thumbnailUrl: text('thumbnail_url'),
  durationSeconds: integer('duration_seconds'),
  isPublic: boolean('is_public').notNull().default(false),
  publicSlug: text('public_slug').unique(),               // Para URLs compartibles
  generationStartedAt: timestamp('generation_started_at'),
  generationCompletedAt: timestamp('generation_completed_at'),
  generationError: text('generation_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const panels = pgTable('panels', {
  id: uuid('id').primaryKey().defaultRandom(),
  episodeId: uuid('episode_id').notNull().references(() => episodes.id),
  sceneId: text('scene_id').notNull(),
  panelId: text('panel_id').notNull(),                    // s01_p01
  panelOrder: integer('panel_order').notNull(),
  backgroundImageUrl: text('background_image_url'),
  characterLayerUrl: text('character_layer_url'),
  effectLayerUrl: text('effect_layer_url'),
  compositeImageUrl: text('composite_image_url'),          // Preview combinada
  prompt: jsonb('prompt'),                                 // Prompt usado para generar
  metadata: jsonb('metadata'),                             // Parallax config, timing, etc.
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const audioTracks = pgTable('audio_tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  episodeId: uuid('episode_id').notNull().references(() => episodes.id),
  trackType: text('track_type').notNull(),                 // dialogue, music, sfx
  characterId: uuid('character_id').references(() => characters.id),
  audioUrl: text('audio_url').notNull(),                   // S3 URL
  durationMs: integer('duration_ms').notNull(),
  panelId: text('panel_id'),                               // A qué panel pertenece
  metadata: jsonb('metadata'),                             // Settings de ElevenLabs, etc.
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const generationJobs = pgTable('generation_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  episodeId: uuid('episode_id').notNull().references(() => episodes.id),
  inngestRunId: text('inngest_run_id'),
  currentStep: text('current_step'),                       // Nombre del paso actual
  progress: integer('progress').notNull().default(0),      // 0-100
  stepsCompleted: jsonb('steps_completed'),                 // Array de pasos completados con timestamps
  error: text('error'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});
```

---

## API Routes

### tRPC Routers

```
project.create         POST   — Crear proyecto + trigger ingesta
project.list           GET    — Listar proyectos del usuario
project.get            GET    — Detalle de proyecto con episodios
project.delete         DELETE — Eliminar proyecto y assets

episode.get            GET    — Detalle de episodio
episode.getPublic      GET    — Episodio público (sin auth)
episode.togglePublic   POST   — Hacer público/privado
episode.regenerate     POST   — Regenerar episodio

generation.trigger     POST   — Iniciar generación de episodio
generation.status      GET    — Estado actual de la generación (polling o realtime)
generation.cancel      POST   — Cancelar generación en curso

billing.getUsage       GET    — Episodios usados/disponibles
billing.createCheckout POST   — Crear sesión de Stripe Checkout
billing.getPortalUrl   GET    — URL del portal de Stripe para gestionar suscripción
billing.buyCredits     POST   — Comprar créditos extra
```

---

## Pipeline de Generación con Inngest

### Workflow Principal

```typescript
// src/inngest/functions/generate-episode.ts (pseudocódigo de referencia)

export const generateEpisode = inngest.createFunction(
  {
    id: "generate-episode",
    retries: 2,
    onFailure: async ({ error, event }) => {
      // Actualizar estado a 'failed', notificar usuario
    }
  },
  { event: "episode/generate.requested" },
  async ({ event, step }) => {
    const { episodeId, projectId } = event.data;

    // Paso 1: Verificar que el contenido está ingestado
    const content = await step.run("verify-content", async () => {
      return getProjectContent(projectId);
    });

    // Paso 2: Análisis (si no existe ya)
    const analysis = await step.run("analyze-content", async () => {
      return analyzeContent(content);  // Claude Sonnet → Fase 1
    });

    // Paso 3: Plan de serie (si no existe ya)
    const plan = await step.run("plan-series", async () => {
      return planSeries(analysis);  // Claude Sonnet → Fase 2
    });

    // Paso 4: Generar character sheets (si no existen)
    const characters = await step.run("generate-characters", async () => {
      return generateCharacterSheets(plan.characters);  // fal.ai
    });

    // Paso 5: Generar guión del episodio
    const script = await step.run("generate-script", async () => {
      return generateScript(analysis, plan, episodeId);  // Claude Opus → Fase 3
    });

    // Paso 6: Validar guión
    const validatedScript = await step.run("validate-script", async () => {
      return validateScript(script, analysis);  // Claude Sonnet → QA
    });

    // Paso 7: Generar prompts visuales
    const visualPrompts = await step.run("generate-visual-prompts", async () => {
      return generateVisualPrompts(validatedScript);  // Claude Sonnet → Fase 4
    });

    // Paso 8: Generar paneles (paralelizable)
    const panels = await step.run("generate-panels", async () => {
      return generateAllPanels(visualPrompts, characters);  // fal.ai — batch
    });

    // Paso 9: Generar audio direction
    const audioDir = await step.run("generate-audio-direction", async () => {
      return generateAudioDirection(validatedScript);  // Claude Sonnet → Fase 5
    });

    // Paso 10: Generar diálogos TTS (paralelizable)
    const dialogues = await step.run("generate-dialogues", async () => {
      return generateDialogues(audioDir);  // ElevenLabs — batch
    });

    // Paso 11: Generar música
    const music = await step.run("generate-music", async () => {
      return generateMusicTracks(audioDir);  // Suno
    });

    // Paso 12: Componer video en Remotion
    const videoUrl = await step.run("compose-video", async () => {
      return composeAndRender({
        panels, dialogues, music, script: validatedScript
      });  // Remotion Lambda
    });

    // Paso 13: Entregar
    await step.run("deliver", async () => {
      return deliverEpisode(episodeId, videoUrl);
      // Actualizar DB, notificar usuario
    });
  }
);
```

### Progreso en Tiempo Real

```
Estrategia: Supabase Realtime

- Cada step.run() actualiza la tabla generation_jobs con:
  - current_step: nombre del paso
  - progress: porcentaje estimado
  - steps_completed: array acumulativo

- El frontend hace subscribe a cambios en generation_jobs via Supabase Realtime
- Se muestra barra de progreso con nombre del paso actual

Progreso estimado por paso:
  verify-content:       5%
  analyze-content:     10%
  plan-series:         15%
  generate-characters: 25%
  generate-script:     35%
  validate-script:     40%
  generate-visual-prompts: 45%
  generate-panels:     70%  (el más largo — batch de imágenes)
  generate-audio:      80%
  generate-music:      85%
  compose-video:       95%
  deliver:            100%
```

---

## Integraciones Externas

### Claude API (Anthropic)

```
Uso: Fases 1-5 del pipeline de prompts
Modelos:
  - claude-sonnet-4-5-20250929: análisis, planificación, visual prompts, audio direction, QA
  - claude-opus-4-5-20250301: generación de guión (solo Fase 3)
Rate limits: Tier 2+ recomendado para producción
SDK: @anthropic-ai/sdk
```

### fal.ai (Generación de Imágenes)

```
Uso: Character sheets + paneles
Modelo: fal-ai/flux/dev o fal-ai/flux-pro
Features necesarias:
  - IP-Adapter para consistencia de personajes
  - Generación en batch (20+ imágenes por episodio)
  - Rembg para separación de capas
SDK: @fal-ai/client
Coste: ~$0.02/imagen
```

### ElevenLabs (TTS)

```
Uso: Diálogos de personajes + narración
Plan: Pro ($22/mes, 500K chars)
Features:
  - Voice cloning para personajes únicos
  - Parámetros de emoción (stability, similarity, style)
  - Múltiples voces simultáneas
SDK: elevenlabs (npm)
```

### Suno API (Música)

```
Uso: Música de fondo por escena
Features:
  - Generación por prompt de texto
  - Tracks cortos (30s-60s) loopables
  - Variedad de moods
Alternativa: Udio API si Suno no tiene API pública estable
Fallback: Librería de música royalty-free (Epidemic Sound API)
```

### Remotion + Lambda (Composición de Video)

```
Uso: Ensamblar paneles + audio → MP4
Stack:
  - @remotion/core: composición como React
  - @remotion/lambda: render serverless
  - @remotion/player: preview en browser
Features:
  - Parallax con spring animations
  - Sincronización audio-visual frame-accurate
  - Subtítulos renderizados
  - Export 1080p MP4
Coste: ~$0.15/render (Lambda compute)
```

### Supabase

```
Uso: Auth + Database + Realtime + Storage
Plan: Pro ($25/mes)
Features:
  - Auth con Google/GitHub
  - PostgreSQL con Drizzle ORM
  - Realtime subscriptions para progreso de generación
  - Storage para archivos temporales
```

### Stripe

```
Uso: Suscripciones + créditos extra
Features:
  - Checkout sessions para suscripción
  - Customer portal para gestionar plan
  - Metered billing para créditos extra
  - Webhooks para sincronizar estado
```

---

## Variables de Entorno

```bash
# .env.example

# === App ===
NEXT_PUBLIC_APP_URL=http://localhost:3000

# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# === Anthropic (Claude) ===
ANTHROPIC_API_KEY=

# === fal.ai (Imágenes) ===
FAL_KEY=

# === ElevenLabs (TTS) ===
ELEVENLABS_API_KEY=

# === Suno (Música) — o alternativa ===
SUNO_API_KEY=

# === AWS (S3 + CloudFront) ===
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-west-1
AWS_S3_BUCKET=animelearn-assets
AWS_CLOUDFRONT_DOMAIN=
AWS_CLOUDFRONT_KEY_PAIR_ID=
AWS_CLOUDFRONT_PRIVATE_KEY=

# === Remotion Lambda ===
REMOTION_AWS_REGION=eu-west-1

# === Stripe ===
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_CREATOR_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_CREDIT_PRICE_ID=

# === Inngest ===
INNGEST_SIGNING_KEY=
INNGEST_EVENT_KEY=

# === Monitoring ===
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
```

---

## Comandos de Desarrollo

```bash
# Desarrollo
npm run dev              # Next.js dev server
npx inngest-cli dev      # Inngest dev server (para testear workflows localmente)
npx remotion studio      # Remotion Studio (preview de composiciones)

# Base de datos
npx drizzle-kit generate  # Generar migración
npx drizzle-kit push      # Aplicar migración
npx drizzle-kit studio    # UI para explorar DB

# Testing del pipeline
npx tsx scripts/test-pipeline.ts  # Test manual end-to-end

# Remotion
npx remotion render src/remotion/Root.tsx Episode --props='{"episodeId":"xxx"}'

# Deploy
npx remotion lambda sites create src/remotion/Root.tsx  # Deploy Remotion a Lambda
vercel deploy              # Deploy app a Vercel
```
