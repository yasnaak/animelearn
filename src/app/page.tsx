'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Player } from '@remotion/player';
import { trpc } from '@/lib/trpc/client';
import { EpisodeComposition } from '@/remotion/EpisodeComposition';
import { EpisodeCompositionV2 } from '@/remotion/EpisodeCompositionV2';
import type { EpisodeCompositionProps, EpisodeCompositionPropsV2 } from '@/remotion/types';
import {
  Sparkles,
  Mic,
  Film,
  ArrowRight,
  Zap,
  Play,
  Globe,
  Users,
  ChevronRight,
  Download,
  Swords,
  Laugh,
  Rocket,
  Skull,
  Heart,
  Wand2,
  Palette,
  Pencil,
  Sun,
  Moon,
  Music,
  Camera,
  Check,
  Eye,
  Layers,
} from 'lucide-react';

/* ───────── intersection-observer fade-in ───────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll('.al-reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('al-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );
    items.forEach((c) => io.observe(c));

    const revealAnchorTarget = () => {
      const hash = window.location.hash;
      if (!hash) return;
      const target = el.querySelector(hash);
      if (target) {
        target.querySelectorAll('.al-reveal').forEach((child) => {
          child.classList.add('al-visible');
          io.unobserve(child);
        });
        if (target.querySelector('.al-reveal') === null) {
          const parent = target.closest('section');
          parent?.querySelectorAll('.al-reveal').forEach((child) => {
            child.classList.add('al-visible');
            io.unobserve(child);
          });
        }
      }
    };

    revealAnchorTarget();
    window.addEventListener('hashchange', revealAnchorTarget);

    return () => {
      io.disconnect();
      window.removeEventListener('hashchange', revealAnchorTarget);
    };
  }, []);
  return ref;
}

/* ───────── constants ───────── */
const DEMO_EPISODE_ID = '037e90d9-fcb6-4427-ac7e-65e8eee56fd1';
const FPS = 30;
const INTRO_FRAMES = 150;
const END_CARD_FRAMES = 450;
const TRANSITION_FRAMES = 15;

function calcFrames(props: EpisodeCompositionProps | EpisodeCompositionPropsV2): number {
  if ('coldOpen' in props) {
    const v2 = props as EpisodeCompositionPropsV2;
    let f = v2.coldOpen ? 3 * FPS : 0;
    f += 3 * FPS;
    for (const scene of v2.scenes) {
      for (let i = 0; i < scene.shots.length; i++) {
        const isFirstShotOfScene = i === 0;
        const transitionFrames = isFirstShotOfScene ? 15 : 3;
        f += scene.shots[i].durationFrames - transitionFrames;
      }
    }
    return f + END_CARD_FRAMES;
  }

  const v1 = props as EpisodeCompositionProps;
  let f = 0;
  for (const scene of v1.scenes) {
    for (let i = 0; i < scene.panels.length; i++) {
      f += scene.panels[i].durationFrames;
      if (i < scene.panels.length - 1) f -= TRANSITION_FRAMES;
    }
  }
  return INTRO_FRAMES + f + END_CARD_FRAMES;
}

/* ───────── main page ───────── */
export default function LandingPage() {
  const revealRef = useReveal();
  const [demoActive, setDemoActive] = useState(false);
  const { data: demoData } = trpc.render.getPublicCompositionProps.useQuery(
    { episodeId: DEMO_EPISODE_ID },
    { retry: false, refetchOnWindowFocus: false },
  );
  const totalFrames = useMemo(
    () => (demoData?.props ? calcFrames(demoData.props) : 900),
    [demoData?.props],
  );

  return (
    <div ref={revealRef} className="dark relative min-h-screen overflow-hidden bg-[#06060b] text-white">
      {/* ── global bg effects ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* radial glow top center */}
        <div className="absolute left-1/2 -top-[300px] h-[800px] w-[1200px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(0,210,255,0.07)_0%,transparent_60%)]" />
        {/* radial glow bottom right */}
        <div className="absolute -bottom-[200px] -right-[200px] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle,rgba(217,70,239,0.05)_0%,transparent_60%)]" />
        {/* noise grain */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />
      </div>

      {/* ── nav ── */}
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-500 shadow-lg shadow-cyan-500/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">Drawnema</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm text-zinc-500 md:flex">
          <a href="#how" className="transition-colors hover:text-white">How It Works</a>
          <a href="#demo" className="transition-colors hover:text-white">Demo</a>
          <a href="#features" className="transition-colors hover:text-white">Features</a>
          <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
            <Link href="/auth/signin">Sign In</Link>
          </Button>
          <Button asChild size="sm" className="bg-white text-black font-medium hover:bg-zinc-200 shadow-lg shadow-white/10">
            <Link href="/auth/signin">Start Free</Link>
          </Button>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-6 pb-20 pt-16 text-center lg:px-10 lg:pt-28">
        <Badge variant="outline" className="al-reveal mb-6 border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5 text-cyan-300">
          <Zap className="mr-1.5 h-3 w-3" /> Now in open beta — first episode free
        </Badge>

        <h1 className="al-reveal mx-auto max-w-5xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-[5.2rem]">
          <span className="block">Your Ideas Deserve</span>
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
            Their Own Animated Series
          </span>
        </h1>

        <p className="al-reveal mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
          The first AI platform that turns any idea into full animated episodes — anime, cartoon,
          sketch, or any style you choose. Consistent characters, cinematic shots, voices, and music.
          Ready for YouTube in minutes.
        </p>

        <div className="al-reveal mt-10 flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="group bg-white px-8 text-base font-semibold text-black shadow-xl shadow-white/10 hover:bg-zinc-100">
            <Link href="/auth/signin">
              Create Your First Episode
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-zinc-800 bg-transparent px-8 text-base text-zinc-300 hover:border-zinc-600 hover:bg-white/5">
            <Link href="#demo">
              <Play className="mr-1.5 h-4 w-4" />
              Watch Demo
            </Link>
          </Button>
        </div>

        {/* ── hero visual: idea → anime → youtube pipeline ── */}
        <div className="al-reveal mt-16 w-full max-w-4xl">
          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr,32px,1fr,32px,1fr]">
            {/* Input: idea text */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Your idea</span>
              </div>
              <p className="text-left font-mono text-xs leading-relaxed text-zinc-400">
                &quot;A young hacker discovers a sentient AI hiding inside the deep web. She must protect it from a corporation that wants to weaponize it...&quot;
              </p>
              <div className="mt-1 inline-block h-3 w-[3px] animate-pulse bg-cyan-400" />
            </div>

            {/* Arrow */}
            <div className="hidden items-center justify-center md:flex">
              <ChevronRight className="h-5 w-5 text-zinc-700" />
            </div>

            {/* Output: anime frame */}
            <div className="relative overflow-hidden rounded-xl border border-fuchsia-500/20 bg-zinc-900/60 backdrop-blur-sm">
              <div className="aspect-[16/10]">
                <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-900/40 via-cyan-900/20 to-violet-900/40" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,rgba(0,200,255,0.15)_0%,transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_60%,rgba(217,70,239,0.12)_0%,transparent_50%)]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Film className="h-8 w-8 text-white/15" />
                  <span className="mt-2 text-[10px] font-medium text-white/25">AI-Generated Episode</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-[10px] font-medium text-white/70">Ep 1: &quot;The Digital Ghost&quot;</p>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden items-center justify-center md:flex">
              <ChevronRight className="h-5 w-5 text-zinc-700" />
            </div>

            {/* YouTube ready */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-red-500/80 flex items-center justify-center">
                  <Play className="h-1.5 w-1.5 text-white" />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">YouTube Ready</span>
              </div>
              <p className="text-xs font-medium text-zinc-300">The Digital Ghost - Episode 1</p>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-600 line-clamp-2">
                When a young hacker discovers a sentient AI in the deep web, she&apos;s drawn into a dangerous game...
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {['animation', 'AI', 'cyberpunk', 'series'].map((t) => (
                  <span key={t} className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[9px] text-zinc-500">#{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ SOCIAL PROOF BAR ═══════════ */}
      <section className="relative z-10 border-y border-zinc-800/40 bg-zinc-900/20 backdrop-blur-sm">
        <div className="al-reveal mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6 py-6 lg:px-10">
          {[
            { icon: Users, value: '12,400+', label: 'creators' },
            { icon: Eye, value: '850K+', label: 'views generated' },
            { icon: Film, value: '3,200+', label: 'episodes created' },
            { icon: Globe, value: '180+', label: 'countries' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <stat.icon className="h-4 w-4 text-zinc-600" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-zinc-200">{stat.value}</span>
                <span className="text-xs text-zinc-600">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how" className="relative z-10 mx-auto max-w-7xl px-6 py-28 lg:px-10">
        <div className="al-reveal text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">How It Works</p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Idea to YouTube in Three Steps
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-500">
            No animation skills. No editing software. No team required.
          </p>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {/* Step 1: Describe */}
          <div className="al-reveal group rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/20 hover:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10 text-xs font-bold text-cyan-400">1</span>
              <h3 className="text-base font-bold">Describe Your Story</h3>
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Type an idea, paste a script, import from YouTube, PDF, or any URL.
            </p>
            {/* Mini mockup: textarea */}
            <div className="mt-5 rounded-lg border border-zinc-800/60 bg-zinc-950/80 p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500/50" />
                <div className="h-1.5 w-1.5 rounded-full bg-yellow-500/50" />
                <div className="h-1.5 w-1.5 rounded-full bg-green-500/50" />
              </div>
              <div className="rounded bg-zinc-900/80 p-2.5">
                <p className="text-[10px] text-zinc-600 mb-1">Describe your story</p>
                <p className="font-mono text-[11px] leading-relaxed text-zinc-400">
                  A samurai who discovers modern-day Tokyo through a time portal. He must learn to navigate the city while being hunted...
                </p>
                <div className="mt-0.5 inline-block h-2.5 w-[2px] animate-pulse bg-cyan-400" />
              </div>
            </div>
          </div>

          {/* Step 2: Generate */}
          <div className="al-reveal group rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm transition-all duration-300 hover:border-fuchsia-500/20 hover:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/10 text-xs font-bold text-fuchsia-400">2</span>
              <h3 className="text-base font-bold">AI Creates Everything</h3>
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Screenplay, characters, animation, voices, music, and sound effects — all automatic.
            </p>
            {/* Mini mockup: generation progress */}
            <div className="mt-5 rounded-lg border border-zinc-800/60 bg-zinc-950/80 p-3">
              <div className="space-y-2.5">
                {[
                  { label: 'Writing screenplay', done: true },
                  { label: 'Designing characters', done: true },
                  { label: 'Generating scenes', done: true },
                  { label: 'Adding voices & music', active: true },
                  { label: 'Compositing video', pending: true },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2.5">
                    {s.done ? (
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500/15">
                        <Check className="h-2.5 w-2.5 text-green-400" />
                      </div>
                    ) : s.active ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-fuchsia-400/80 border-t-transparent" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-zinc-800" />
                    )}
                    <span className={`text-[11px] ${s.done ? 'text-zinc-500' : s.active ? 'text-fuchsia-300' : 'text-zinc-700'}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3: Publish */}
          <div className="al-reveal group rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/20 hover:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-400">3</span>
              <h3 className="text-base font-bold">Publish to YouTube</h3>
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Download HD video with auto-generated titles, descriptions, tags, and thumbnails.
            </p>
            {/* Mini mockup: YouTube upload preview */}
            <div className="mt-5 rounded-lg border border-zinc-800/60 bg-zinc-950/80 p-3">
              <div className="flex gap-3">
                <div className="h-14 w-24 flex-shrink-0 rounded bg-gradient-to-br from-fuchsia-900/40 via-cyan-900/30 to-amber-900/40 flex items-center justify-center">
                  <Play className="h-4 w-4 text-white/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-zinc-300 truncate">The Digital Ghost - Ep 1</p>
                  <p className="mt-0.5 text-[10px] text-zinc-600 line-clamp-2">A young hacker discovers a sentient AI hiding inside the deep web...</p>
                  <div className="mt-1.5 flex gap-1 flex-wrap">
                    {['animation', 'AI', 'series'].map((tag) => (
                      <span key={tag} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[8px] text-zinc-500">#{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ DEMO PLAYER ═══════════ */}
      <section id="demo" className="relative z-10 mx-auto max-w-7xl px-6 py-28 lg:px-10">
        <div className="al-reveal text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-400">Live Demo</p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Watch an AI-Generated Episode
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-500">
            Every frame, voice, and sound effect was created by AI. No human animation involved.
          </p>
        </div>

        <div className="al-reveal relative mt-12">
          {/* glow behind player */}
          <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-r from-cyan-500/5 via-fuchsia-500/5 to-cyan-500/5 blur-2xl" />

          <div className="relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-950 shadow-2xl">
            {!demoActive ? (
              <div
                className="group relative cursor-pointer"
                onClick={() => setDemoActive(true)}
              >
                {/* Placeholder with gradient scene */}
                <div className="aspect-video w-full relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-[#0c0c1a] to-zinc-900" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,rgba(0,200,255,0.08)_0%,transparent_50%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(217,70,239,0.06)_0%,transparent_50%)]" />

                  {/* Play button */}
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:bg-white/10 group-hover:border-white/20">
                      <Play className="h-8 w-8 text-white ml-1" />
                    </div>
                    <span className="rounded-full bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-zinc-400 border border-white/5">
                      Press play to watch the demo episode
                    </span>
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute bottom-6 left-6 z-10">
                    <p className="text-xs font-medium text-white/40">100% AI-generated</p>
                  </div>
                  <div className="absolute bottom-6 right-6 z-10">
                    <p className="text-xs text-white/30">Characters, voices, music, animation</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video w-full bg-black">
                {demoData?.props ? (
                  <Player
                    component={
                      demoData.isV2
                        ? (EpisodeCompositionV2 as unknown as React.ComponentType<Record<string, unknown>>)
                        : (EpisodeComposition as unknown as React.ComponentType<Record<string, unknown>>)
                    }
                    inputProps={demoData.props}
                    durationInFrames={totalFrames}
                    compositionWidth={1920}
                    compositionHeight={1080}
                    fps={FPS}
                    style={{ width: '100%', height: '100%' }}
                    controls
                    autoPlay
                    clickToPlay
                    doubleClickToFullscreen
                    spaceKeyToPlayOrPause
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES — BENTO GRID ═══════════ */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-28 lg:px-10">
        <div className="al-reveal text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Features</p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Everything a YouTube Creator Needs
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-500">
            Professional animated content, powered by AI. No animation experience required.
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Characters — large card */}
          <div className="al-reveal group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/20 sm:col-span-2">
            {/* decorative gradient */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/5 blur-3xl transition-all group-hover:bg-cyan-500/10" />
            <div className="relative">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 transition-colors group-hover:bg-cyan-500/15">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">Consistent Characters</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
                AI designs characters once and maintains their appearance across every episode.
                Same faces, outfits, and proportions. No drift between scenes.
              </p>
              {/* Mini character sheet mockup */}
              <div className="mt-5 flex gap-3">
                {['Protagonist', 'Rival', 'Mentor'].map((name, i) => (
                  <div key={name} className="flex-1 rounded-lg border border-zinc-800/60 bg-zinc-950/50 p-2 text-center">
                    <div
                      className="mx-auto mb-1.5 h-10 w-10 rounded-full"
                      style={{
                        background: [
                          'linear-gradient(135deg, #22d3ee30, #06b6d420)',
                          'linear-gradient(135deg, #d946ef30, #a855f720)',
                          'linear-gradient(135deg, #f59e0b30, #f9731620)',
                        ][i],
                      }}
                    />
                    <p className="text-[10px] text-zinc-500">{name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cinematic */}
          <div className="al-reveal group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm transition-all duration-300 hover:border-fuchsia-500/20">
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-fuchsia-500/5 blur-3xl transition-all group-hover:bg-fuchsia-500/10" />
            <div className="relative">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-400 transition-colors group-hover:bg-fuchsia-500/15">
                <Camera className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">Cinematic Shots</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Dynamic angles, tracking shots, zooms, and pans. Professional cinematography that rivals hand-animated productions.
              </p>
            </div>
          </div>

          {/* AI Voices */}
          <div className="al-reveal group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/20">
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-500/5 blur-3xl transition-all group-hover:bg-amber-500/10" />
            <div className="relative">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 transition-colors group-hover:bg-amber-500/15">
                <Mic className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">AI Voice Acting</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                2,500+ voices with natural emotion. Each character gets their own unique voice with perfect timing and inflection.
              </p>
            </div>
          </div>

          {/* YouTube SEO — large card */}
          <div className="al-reveal group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm transition-all duration-300 hover:border-green-500/20 sm:col-span-2">
            <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-green-500/5 blur-3xl transition-all group-hover:bg-green-500/10" />
            <div className="relative">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-400 transition-colors group-hover:bg-green-500/15">
                <Download className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">YouTube-Ready Export</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
                1080p MP4 with auto-generated titles, descriptions, tags, chapters, and thumbnail prompts.
                Optimized for the YouTube algorithm.
              </p>
              {/* Mini metadata mockup */}
              <div className="mt-5 rounded-lg border border-zinc-800/60 bg-zinc-950/50 p-3">
                <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                  <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-red-400">Title</span>
                  <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-blue-400">Description</span>
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-400">Tags</span>
                  <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-green-400">Chapters</span>
                  <span className="rounded bg-fuchsia-500/15 px-1.5 py-0.5 text-fuchsia-400">Thumbnail</span>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Episode */}
          <div className="al-reveal group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm transition-all duration-300 hover:border-violet-500/20">
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-500/5 blur-3xl transition-all group-hover:bg-violet-500/10" />
            <div className="relative">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 transition-colors group-hover:bg-violet-500/15">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">Multi-Episode Series</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Generate full series with coherent story arcs, character development, and cliffhangers that keep audiences coming back.
              </p>
            </div>
          </div>

          {/* Any Language */}
          <div className="al-reveal group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm transition-all duration-300 hover:border-rose-500/20">
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-rose-500/5 blur-3xl transition-all group-hover:bg-rose-500/10" />
            <div className="relative">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 transition-colors group-hover:bg-rose-500/15">
                <Globe className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">Any Language</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Create content in English, Spanish, Japanese, and more. Natural pronunciation with culturally appropriate voice styles.
              </p>
            </div>
          </div>

          {/* Music & SFX */}
          <div className="al-reveal group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm transition-all duration-300 hover:border-sky-500/20">
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-500/5 blur-3xl transition-all group-hover:bg-sky-500/10" />
            <div className="relative">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 transition-colors group-hover:bg-sky-500/15">
                <Music className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">Original Soundtrack</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                AI-composed background music and sound effects tailored to every scene. Tension, comedy, action — the score adapts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ STYLE SHOWCASE ═══════════ */}
      <section id="styles" className="relative z-10 mx-auto max-w-7xl px-6 py-28 lg:px-10">
        <div className="al-reveal text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Visual Styles</p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Your Story, Your Style
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-500">
            From cinematic anime to hand-drawn sketches — choose the visual style that matches your creative vision.
          </p>
        </div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="al-reveal mt-16 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scrollbar-hide lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
          {[
            {
              name: 'Clean Modern',
              icon: Sparkles,
              mood: 'Sharp lines, vibrant colors, and polished anime aesthetic. Perfect for action, sci-fi, and drama.',
              gradient: 'from-cyan-950/60 via-blue-950/40 to-cyan-950/60',
              border: 'border-cyan-500/15',
              accent: 'text-cyan-400',
              dot: 'bg-cyan-500',
            },
            {
              name: 'Soft Pastel',
              icon: Sun,
              mood: 'Gentle tones, dreamy atmospheres, and warm palettes. Ideal for romance, slice-of-life, and wholesome stories.',
              gradient: 'from-pink-950/60 via-rose-950/40 to-pink-950/60',
              border: 'border-pink-500/15',
              accent: 'text-pink-400',
              dot: 'bg-pink-500',
            },
            {
              name: 'Dark Dramatic',
              icon: Moon,
              mood: 'High contrast, deep shadows, and intense lighting. Made for horror, thriller, and dark fantasy.',
              gradient: 'from-violet-950/60 via-purple-950/40 to-violet-950/60',
              border: 'border-violet-500/15',
              accent: 'text-violet-400',
              dot: 'bg-violet-500',
            },
            {
              name: 'Retro Classic',
              icon: Film,
              mood: '80s and 90s anime nostalgia with grain textures, warm color grading, and vintage charm.',
              gradient: 'from-amber-950/60 via-orange-950/40 to-amber-950/60',
              border: 'border-amber-500/15',
              accent: 'text-amber-400',
              dot: 'bg-amber-500',
            },
            {
              name: 'Sketch Cartoon',
              icon: Pencil,
              mood: 'Simple stick-figure style with bold outlines and flat colors. Great for explainers, comedy, and quick content.',
              gradient: 'from-emerald-950/60 via-teal-950/40 to-emerald-950/60',
              border: 'border-emerald-500/15',
              accent: 'text-emerald-400',
              dot: 'bg-emerald-500',
            },
            {
              name: 'Illustrated Cartoon',
              icon: Palette,
              mood: 'Colorful detailed cartoon with rich backgrounds. Cartoon Network vibes for storytelling and entertainment.',
              gradient: 'from-red-950/60 via-orange-950/40 to-red-950/60',
              border: 'border-red-500/15',
              accent: 'text-red-400',
              dot: 'bg-red-500',
            },
          ].map((style) => (
            <div
              key={style.name}
              className={`al-reveal min-w-[260px] snap-center rounded-2xl border ${style.border} bg-gradient-to-br ${style.gradient} p-6 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] lg:min-w-0`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${style.dot}`} />
                <h3 className={`text-lg font-bold ${style.accent}`}>{style.name}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500">{style.mood}</p>
              <div className="mt-4">
                <style.icon className={`h-5 w-5 ${style.accent} opacity-40`} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section id="pricing" className="relative z-10 mx-auto max-w-7xl px-6 py-28 lg:px-10">
        <div className="al-reveal text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-400">Pricing</p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Start Free, Scale When Ready
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-500">
            Your first episode is completely free. No credit card required.
          </p>
        </div>

        <div className="al-reveal mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-2">
          {/* Creator */}
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-8 backdrop-blur-sm">
            <p className="text-sm font-semibold text-zinc-300">Creator</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-5xl font-extrabold tracking-tight text-white">$29</span>
              <span className="text-zinc-500">/month</span>
            </div>
            <p className="mt-3 text-sm text-zinc-500">For creators getting started with animated content.</p>

            <ul className="mt-8 space-y-3">
              {[
                '10 episodes per month',
                'HD 1080p export',
                'AI voice acting (2,500+ voices)',
                'YouTube metadata generation',
                '4 visual styles (anime + cartoon)',
                'Email support',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-400">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-600" />
                  {item}
                </li>
              ))}
            </ul>

            <Button asChild size="lg" variant="outline" className="mt-8 w-full border-zinc-700 text-zinc-300 hover:bg-white/5">
              <Link href="/auth/signin">Get Started</Link>
            </Button>
          </div>

          {/* Pro */}
          <div className="relative rounded-2xl border border-fuchsia-500/20 bg-gradient-to-b from-fuchsia-500/[0.03] to-transparent p-8 backdrop-blur-sm">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white border-0 px-4 shadow-lg shadow-fuchsia-500/20">
              Most Popular
            </Badge>
            <p className="text-sm font-semibold text-zinc-300">Pro</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-5xl font-extrabold tracking-tight text-white">$89</span>
              <span className="text-zinc-500">/month</span>
            </div>
            <p className="mt-3 text-sm text-zinc-500">For serious creators building animated channels.</p>

            <ul className="mt-8 space-y-3">
              {[
                'Unlimited episodes',
                '4K export',
                'Priority AI generation (2x faster)',
                'Custom character design',
                'YouTube SEO + metadata package',
                'All 6 visual styles + custom',
                'Multi-episode series planning',
                'Priority support',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-fuchsia-400" />
                  {item}
                </li>
              ))}
            </ul>

            <Button asChild size="lg" className="mt-8 w-full bg-white font-semibold text-black shadow-lg shadow-white/10 hover:bg-zinc-100">
              <Link href="/auth/signin">Start Creating</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════ CTA FINAL ═══════════ */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-28 lg:px-10">
        <div className="al-reveal relative overflow-hidden rounded-3xl border border-zinc-800/40 bg-zinc-900/20 px-8 py-20 text-center sm:px-16 backdrop-blur-sm">
          {/* decorative glows */}
          <div className="pointer-events-none absolute -left-32 -top-32 h-64 w-64 rounded-full bg-cyan-500/8 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-fuchsia-500/8 blur-3xl" />

          <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Your First Animated Episode Is Free
          </h2>
          <p className="relative mx-auto mt-5 max-w-lg text-lg text-zinc-400">
            No credit card. No animation skills. No team required.
            Just your idea and the publish button.
          </p>
          <div className="relative mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="group bg-white px-10 text-base font-semibold text-black shadow-xl shadow-white/10 hover:bg-zinc-100">
              <Link href="/auth/signin">
                Start Creating Now
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
          <p className="relative mt-6 text-xs text-zinc-600">
            Join 12,400+ creators already using Drawnema
          </p>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="relative z-10 border-t border-zinc-800/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row lg:px-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-fuchsia-500">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold">Drawnema</span>
          </div>
          <div className="flex gap-6 text-sm text-zinc-600">
            <a href="#how" className="transition-colors hover:text-zinc-300">How It Works</a>
            <a href="#features" className="transition-colors hover:text-zinc-300">Features</a>
            <a href="#pricing" className="transition-colors hover:text-zinc-300">Pricing</a>
            <a href="mailto:hello@drawnema.com" className="transition-colors hover:text-zinc-300">Contact</a>
          </div>
          <p className="text-xs text-zinc-700">
            Drawnema 2026. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ═══════════ reveal animation styles ═══════════ */}
      <style>{`
        .al-reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .al-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .al-visible:nth-child(2) { transition-delay: 0.08s; }
        .al-visible:nth-child(3) { transition-delay: 0.16s; }
        .al-visible:nth-child(4) { transition-delay: 0.24s; }
        .al-visible:nth-child(5) { transition-delay: 0.32s; }
        .al-visible:nth-child(6) { transition-delay: 0.40s; }
        .al-visible:nth-child(7) { transition-delay: 0.48s; }

        /* Hide scrollbar for style horizontal scroll */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
