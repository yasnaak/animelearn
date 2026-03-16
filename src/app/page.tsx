'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Player } from '@remotion/player';
import { trpc } from '@/lib/trpc/client';
import { EpisodeComposition } from '@/remotion/EpisodeComposition';
import { EpisodeCompositionV2 } from '@/remotion/EpisodeCompositionV2';
import type { EpisodeCompositionProps, EpisodeCompositionPropsV2 } from '@/remotion/types';
import {
  Sparkles,
  Upload,
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
  Music,
  Camera,
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

    // When navigating via anchor links, instantly reveal elements in the target section
    const revealAnchorTarget = () => {
      const hash = window.location.hash;
      if (!hash) return;
      const target = el.querySelector(hash);
      if (target) {
        target.querySelectorAll('.al-reveal').forEach((child) => {
          child.classList.add('al-visible');
          io.unobserve(child);
        });
        // Also reveal the section-level .al-reveal
        if (target.querySelector('.al-reveal') === null) {
          const parent = target.closest('section');
          parent?.querySelectorAll('.al-reveal').forEach((child) => {
            child.classList.add('al-visible');
            io.unobserve(child);
          });
        }
      }
    };

    // Handle initial load with hash
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
  // V2 detection: V2 has 'coldOpen' field and scenes with 'shots' instead of 'panels'
  if ('coldOpen' in props) {
    // Must match EpisodeCompositionV2 timeline calculation exactly
    const v2 = props as EpisodeCompositionPropsV2;
    let f = v2.coldOpen ? 3 * FPS : 0;
    f += 3 * FPS; // title card
    for (const scene of v2.scenes) {
      for (let i = 0; i < scene.shots.length; i++) {
        const isFirstShotOfScene = i === 0;
        const transitionFrames = isFirstShotOfScene ? 15 : 3;
        f += scene.shots[i].durationFrames - transitionFrames;
      }
    }
    return f + END_CARD_FRAMES;
  }

  // V1
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
  const [videoOpen, setVideoOpen] = useState(false);
  const { data: demoData } = trpc.render.getPublicCompositionProps.useQuery(
    { episodeId: DEMO_EPISODE_ID },
    { retry: false, refetchOnWindowFocus: false },
  );
  const totalFrames = useMemo(
    () => (demoData?.props ? calcFrames(demoData.props) : 900),
    [demoData?.props],
  );

  return (
    <div ref={revealRef} className="dark relative min-h-screen overflow-hidden bg-[#08080f] text-white">
      {/* ── global bg effects ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* radial glow top-left */}
        <div className="absolute -left-40 -top-40 h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle,rgba(0,200,255,0.08)_0%,transparent_70%)]" />
        {/* radial glow bottom-right */}
        <div className="absolute -bottom-60 -right-60 h-[800px] w-[800px] rounded-full bg-[radial-gradient(circle,rgba(255,0,128,0.06)_0%,transparent_70%)]" />
        {/* noise grain overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />
        {/* horizontal scan-line */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.01)_2px,rgba(255,255,255,0.01)_4px)]" />
      </div>

      {/* ── nav ── */}
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">AnimeForge</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          <a href="#how" className="transition-colors hover:text-white">How It Works</a>
          <a href="#demo" className="transition-colors hover:text-white">Demo</a>
          <a href="#features" className="transition-colors hover:text-white">Features</a>
          <a href="#genres" className="transition-colors hover:text-white">Genres</a>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
            <Link href="/auth/signin">Sign In</Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30">
            <Link href="/auth/signin">Start Creating</Link>
          </Button>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-6 pb-24 pt-20 text-center lg:px-10 lg:pt-32">
        {/* decorative speed lines */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
          <div className="h-[600px] w-[1px] rotate-[25deg] bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent" />
        </div>
        <div className="pointer-events-none absolute left-1/2 top-0 ml-40 -translate-x-1/2">
          <div className="h-[500px] w-[1px] rotate-[20deg] bg-gradient-to-b from-transparent via-fuchsia-500/15 to-transparent" />
        </div>
        <div className="pointer-events-none absolute left-1/2 top-0 -ml-52 -translate-x-1/2">
          <div className="h-[550px] w-[1px] rotate-[30deg] bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent" />
        </div>

        <Badge variant="outline" className="al-reveal mb-6 border-cyan-500/30 bg-cyan-500/5 text-cyan-300">
          <Zap className="mr-1 h-3 w-3" /> AI-Powered Anime Creation
        </Badge>

        <h1 className="al-reveal mx-auto max-w-4xl text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
          <span className="block">Turn Any Idea Into</span>
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
            Your Own Anime Series
          </span>
        </h1>

        <p className="al-reveal mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
          AI-powered anime creation for YouTube creators. Characters, voices, music,
          and cinematic quality — ready to publish in minutes.
        </p>

        <div className="al-reveal mt-10 flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="group relative bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-8 text-base font-semibold text-white shadow-xl shadow-cyan-500/25 transition-shadow hover:shadow-cyan-500/40">
            <Link href="/auth/signin">
              Start Creating
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-zinc-700 bg-transparent px-8 text-base text-zinc-300 hover:border-zinc-500 hover:bg-white/5">
            <Link href="#demo">
              <Play className="mr-1.5 h-4 w-4" />
              Watch Demo
            </Link>
          </Button>
        </div>

        {/* hero stats */}
        <div className="al-reveal mt-16 grid grid-cols-3 gap-8 border-t border-zinc-800/60 pt-10 sm:gap-16">
          {[
            { value: '5 min', label: 'From idea to episode' },
            { value: '2500+', label: 'AI voices available' },
            { value: '1080p', label: 'YouTube-ready export' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold text-white sm:text-3xl">{s.value}</div>
              <div className="mt-1 text-xs text-zinc-500 sm:text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how" className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="al-reveal text-center">
          <Badge variant="outline" className="mb-4 border-fuchsia-500/30 bg-fuchsia-500/5 text-fuchsia-300">
            How It Works
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Three Steps to Your Anime Series
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            No animation skills needed. No editing software. Just your idea and the publish button.
          </p>
        </div>

        {/* 3-step horizontal cards */}
        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            {
              step: '01',
              icon: Upload,
              title: 'Describe Your Idea',
              desc: 'Write a concept, paste a script, or import from any URL. Action scene, comedy sketch, sci-fi saga — anything goes.',
              gradient: 'from-cyan-500 to-cyan-400',
              shadow: 'shadow-cyan-500/30',
              border: 'border-cyan-500/20',
            },
            {
              step: '02',
              icon: Sparkles,
              title: 'AI Creates Your Series',
              desc: 'Characters, scenes, voices, music — all generated automatically. Watch your idea come to life as a multi-episode anime series.',
              gradient: 'from-fuchsia-500 to-fuchsia-400',
              shadow: 'shadow-fuchsia-500/30',
              border: 'border-fuchsia-500/20',
            },
            {
              step: '03',
              icon: Download,
              title: 'Publish to YouTube',
              desc: 'Download in HD with auto-generated titles, descriptions, and thumbnails. Upload-ready content in minutes, not months.',
              gradient: 'from-amber-500 to-amber-400',
              shadow: 'shadow-amber-500/30',
              border: 'border-amber-500/20',
            },
          ].map((item) => (
            <div
              key={item.step}
              className={`al-reveal group relative overflow-hidden rounded-2xl border ${item.border} bg-zinc-900/60 p-6 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-opacity-40`}
            >
              {/* step number watermark */}
              <span className="pointer-events-none absolute -right-3 -top-4 font-mono text-[80px] font-black leading-none text-white/[0.03]">
                {item.step}
              </span>

              <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} ${item.shadow} shadow-lg`}>
                <item.icon className="h-6 w-6 text-white" />
              </div>

              <h3 className="text-lg font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* connector arrows between cards (desktop only) */}
        <div className="mt-8 hidden items-center justify-center gap-2 text-zinc-600 md:flex">
          <span className="text-xs tracking-widest uppercase text-zinc-500">Describe</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-xs tracking-widest uppercase text-zinc-500">Generate</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-xs tracking-widest uppercase text-zinc-500">Publish</span>
        </div>
      </section>

      {/* ═══════════ DEMO PLAYER ═══════════ */}
      <section id="demo" className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="al-reveal text-center">
          <Badge variant="outline" className="mb-4 border-cyan-500/30 bg-cyan-500/5 text-cyan-300">
            Live Demo
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            See What AnimeForge Creates
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            This episode was generated entirely by AI — characters, animation, voices, music, and sound effects.
            Press play to see it in action.
          </p>
        </div>

        <div className="al-reveal relative mt-12 w-full overflow-hidden rounded-2xl border border-zinc-700/40 shadow-2xl shadow-cyan-500/10">
          {!videoOpen ? (
            <div
              className="group relative cursor-pointer"
              onClick={() => setVideoOpen(true)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#08080f] via-transparent to-transparent z-10 pointer-events-none" />
              <Image
                src="/landing/hero.webp"
                alt="AI-generated anime episode preview"
                width={1920}
                height={1080}
                className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                priority
              />
              <div className="absolute inset-0 z-20 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl transition-transform group-hover:scale-110">
                  <Play className="h-7 w-7 text-white ml-1" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 z-20">
                <span className="rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-xs text-zinc-300">
                  Watch full demo episode
                </span>
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
      </section>

      {/* ═══════════ FEATURES GRID ═══════════ */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="al-reveal text-center">
          <Badge variant="outline" className="mb-4 border-cyan-500/30 bg-cyan-500/5 text-cyan-300">
            Features
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Everything You Need to Create Anime
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Professional anime production powered by AI. No animation experience required.
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Users,
              title: 'Consistent Characters',
              desc: 'AI creates and maintains character designs across episodes. Same faces, outfits, and proportions every time — no drift between scenes.',
            },
            {
              icon: Camera,
              title: 'Cinematic Quality',
              desc: 'Professional shot composition, camera movements, and transitions. Dynamic angles, zooms, and panning that rival hand-animated productions.',
            },
            {
              icon: Mic,
              title: 'AI Voice Acting',
              desc: '2500+ ultra-realistic voices with emotional delivery. Each character gets their own distinct voice with natural inflection and timing.',
            },
            {
              icon: Music,
              title: 'Original Soundtrack',
              desc: 'AI-generated background music and sound effects tailored to every scene. Tension, comedy, action — the score adapts to the mood.',
            },
            {
              icon: Download,
              title: 'YouTube-Ready Export',
              desc: '1080p MP4 with auto-generated titles, descriptions, and tags. Optimized for YouTube SEO — download and upload directly.',
            },
            {
              icon: Globe,
              title: 'Any Language',
              desc: 'Create anime in English, Spanish, Japanese, and more. Natural pronunciation and culturally appropriate voice styles included.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="al-reveal group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700/80 hover:bg-zinc-900/60"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 text-cyan-400 transition-colors group-hover:from-cyan-500/20 group-hover:to-fuchsia-500/20">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ GENRE GALLERY ═══════════ */}
      <section id="genres" className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="al-reveal text-center">
          <Badge variant="outline" className="mb-4 border-amber-500/30 bg-amber-500/5 text-amber-300">
            Any Genre
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Create Any Genre of Anime
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            From high-octane action to heartfelt romance — AnimeForge adapts to your creative vision. Every genre gets its own visual style and atmosphere.
          </p>
        </div>

        <div className="mt-16 grid gap-4 grid-cols-2 lg:grid-cols-3">
          {[
            {
              name: 'Action',
              icon: Swords,
              desc: 'Explosive fights, dramatic power-ups, and intense choreography',
              gradient: 'from-red-600/20 to-orange-600/20',
              border: 'border-red-500/20',
              accent: 'text-red-400',
              iconBg: 'from-red-500 to-orange-500',
            },
            {
              name: 'Comedy',
              icon: Laugh,
              desc: 'Snappy timing, exaggerated expressions, and visual gags',
              gradient: 'from-yellow-600/20 to-amber-600/20',
              border: 'border-yellow-500/20',
              accent: 'text-yellow-400',
              iconBg: 'from-yellow-500 to-amber-500',
            },
            {
              name: 'Sci-Fi',
              icon: Rocket,
              desc: 'Futuristic worlds, advanced tech, and cosmic exploration',
              gradient: 'from-cyan-600/20 to-blue-600/20',
              border: 'border-cyan-500/20',
              accent: 'text-cyan-400',
              iconBg: 'from-cyan-500 to-blue-500',
            },
            {
              name: 'Horror',
              icon: Skull,
              desc: 'Dark atmospheres, suspense builds, and chilling reveals',
              gradient: 'from-violet-600/20 to-purple-600/20',
              border: 'border-violet-500/20',
              accent: 'text-violet-400',
              iconBg: 'from-violet-500 to-purple-500',
            },
            {
              name: 'Romance',
              icon: Heart,
              desc: 'Tender moments, emotional depth, and beautiful scenery',
              gradient: 'from-pink-600/20 to-rose-600/20',
              border: 'border-pink-500/20',
              accent: 'text-pink-400',
              iconBg: 'from-pink-500 to-rose-500',
            },
            {
              name: 'Fantasy',
              icon: Wand2,
              desc: 'Magical worlds, epic quests, and mythical creatures',
              gradient: 'from-emerald-600/20 to-teal-600/20',
              border: 'border-emerald-500/20',
              accent: 'text-emerald-400',
              iconBg: 'from-emerald-500 to-teal-500',
            },
          ].map((genre) => (
            <div
              key={genre.name}
              className={`al-reveal group relative overflow-hidden rounded-2xl border ${genre.border} bg-gradient-to-br ${genre.gradient} p-6 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-opacity-40`}
            >
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${genre.iconBg} shadow-lg`}>
                <genre.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className={`text-lg font-bold ${genre.accent}`}>{genre.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{genre.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ CTA FINAL ═══════════ */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="al-reveal relative overflow-hidden rounded-3xl border border-zinc-800/60 bg-gradient-to-br from-cyan-950/30 via-zinc-900/60 to-fuchsia-950/30 px-8 py-16 text-center sm:px-16">
          {/* decorative orbs */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to Create Your First Anime Series?
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-zinc-400">
            Join creators who are building anime channels without a studio, a team,
            or years of animation training. Your first episode is free.
          </p>
          <div className="relative mt-8">
            <Button asChild size="lg" className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-10 text-base font-semibold text-white shadow-xl shadow-cyan-500/25">
              <Link href="/auth/signin">
                Start for Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="relative z-10 border-t border-zinc-800/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row lg:px-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-fuchsia-500">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold">AnimeForge</span>
          </div>
          <div className="flex gap-6 text-sm text-zinc-500">
            <a href="#how" className="transition-colors hover:text-zinc-300">How It Works</a>
            <a href="#features" className="transition-colors hover:text-zinc-300">Features</a>
            <a href="mailto:hello@animeforge.com" className="transition-colors hover:text-zinc-300">Contact</a>
          </div>
          <p className="text-xs text-zinc-600">
            AnimeForge 2026. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ═══════════ reveal animation styles ═══════════ */}
      <style>{`
        .al-reveal {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .al-visible {
          opacity: 1;
          transform: translateY(0);
        }
        /* stagger children */
        .al-visible:nth-child(2) { transition-delay: 0.08s; }
        .al-visible:nth-child(3) { transition-delay: 0.16s; }
        .al-visible:nth-child(4) { transition-delay: 0.24s; }
        .al-visible:nth-child(5) { transition-delay: 0.32s; }
      `}</style>
    </div>
  );
}
