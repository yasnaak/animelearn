# AnimeLearn

Transform educational content into motion comic anime episodes using AI.

Upload a PDF or YouTube URL, and AnimeLearn generates a fully animated anime episode with voice acting, music, sound effects, and cinematic video clips.

## Stack

- **Framework**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Backend**: tRPC v11 + Drizzle ORM + PostgreSQL (Railway)
- **Auth**: Supabase (Google OAuth)
- **AI Script**: Claude API (Anthropic) — 5-phase pipeline (analyze, plan, script, visual prompts, audio direction)
- **Images**: fal.ai — character sheets, backgrounds, effects (4 art styles)
- **Video**: LTX-2.3 via Replicate — image-to-video animation for each panel
- **Audio**: ElevenLabs — TTS dialogue, generative music, sound effects
- **Composition**: Remotion — parallax layers, transitions, subtitle sync, final MP4 render
- **Deploy**: Vercel (animelearn.vercel.app)

## Getting Started

```bash
cp .env.example .env.local
# Fill in all API keys (see below)

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

```
DATABASE_URL=            # PostgreSQL connection string (Railway)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=       # Claude API
FAL_KEY=                 # fal.ai image generation
ELEVENLABS_API_KEY=      # TTS, music, SFX
REPLICATE_API_TOKEN=     # LTX-2.3 video generation
AWS_ACCESS_KEY_ID=       # S3 storage
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
```

## Project Structure

```
src/
  app/                   # Next.js App Router pages
    dashboard/           # Protected dashboard routes
    api/                 # API routes (tRPC, upload)
  components/ui/         # shadcn/ui components
  server/
    db/                  # Drizzle schema + migrations
    trpc/                # tRPC routers (project, generation, visuals, audio, video, render)
    services/            # AI pipeline, fal, elevenlabs, replicate, render
  remotion/              # Remotion video composition components
```

## AI Pipeline

1. **Analyze** (Sonnet) — Extract key concepts, characters, narrative arcs from source material
2. **Plan** (Sonnet) — Structure multi-episode series with learning objectives
3. **Script** (Opus) — Full screenplay with dialogue, stage directions, panel breakdowns
4. **Visual Prompts** (Sonnet) — Per-panel image prompts + video motion prompts for LTX-2.3
5. **Audio Direction** (Sonnet) — Voice assignments, music cues, SFX triggers

## Art Styles

- Clean Modern — sharp lines, vibrant colors
- Soft Pastel — watercolor tones, gentle gradients
- Dark Dramatic — high contrast, cinematic shadows
- Retro Classic — 90s anime aesthetic
