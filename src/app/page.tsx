'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Upload,
  Palette,
  Mic,
  Film,
  ArrowRight,
  Check,
  Zap,
  Play,
  BookOpen,
  Globe,
  Users,
  ChevronRight,
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

/* ───────── main page ───────── */
// Demo video — replace with your own YouTube video ID or URL
const DEMO_VIDEO_ID = 'dQw4w9WgXcQ'; // placeholder — swap with a real demo

export default function LandingPage() {
  const revealRef = useReveal();
  const [videoOpen, setVideoOpen] = useState(false);

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
          <span className="text-lg font-bold tracking-tight">AnimeLearn</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          <a href="#how" className="transition-colors hover:text-white">How It Works</a>
          <a href="#styles" className="transition-colors hover:text-white">Styles</a>
          <a href="#features" className="transition-colors hover:text-white">Features</a>
          <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
          <Link href="/examples" className="transition-colors hover:text-white">Examples</Link>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30">
            <Link href="/login">Get Started</Link>
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
          <Zap className="mr-1 h-3 w-3" /> AI-Powered Anime Generation
        </Badge>

        <h1 className="al-reveal mx-auto max-w-4xl text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
          <span className="block">Study Smarter With</span>
          <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
            Anime Episodes
          </span>
        </h1>

        <p className="al-reveal mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
          Drop your lecture notes or paste a YouTube class. Get back a fully animated anime
          episode that makes any subject stick — characters, voices, music, and all.
        </p>

        <div className="al-reveal mt-10 flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="group relative bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-8 text-base font-semibold text-white shadow-xl shadow-cyan-500/25 transition-shadow hover:shadow-cyan-500/40">
            <Link href="/login">
              Try It Free
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-zinc-700 bg-transparent px-8 text-base text-zinc-300 hover:border-zinc-500 hover:bg-white/5">
            <Link href="#how">
              <Play className="mr-1.5 h-4 w-4" />
              See How It Works
            </Link>
          </Button>
        </div>

        {/* hero showcase — image with inline video player */}
        <div className="al-reveal relative mt-16 w-full overflow-hidden rounded-2xl border border-zinc-700/40 shadow-2xl shadow-cyan-500/10">
          {!videoOpen ? (
            <div
              className="group relative cursor-pointer"
              onClick={() => setVideoOpen(true)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#08080f] via-transparent to-transparent z-10 pointer-events-none" />
              <Image
                src="/landing/hero.webp"
                alt="AI-generated anime classroom scene with holographic scientific diagrams"
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
                  Watch demo
                </span>
              </div>
            </div>
          ) : (
            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${DEMO_VIDEO_ID}?autoplay=1&rel=0`}
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          )}
        </div>

        {/* hero stats */}
        <div className="al-reveal mt-12 grid grid-cols-3 gap-8 border-t border-zinc-800/60 pt-10 sm:gap-16">
          {[
            { value: '5 min', label: 'From notes to anime' },
            { value: '4', label: 'Art styles to choose from' },
            { value: '3', label: 'Languages supported' },
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
            From Notes to Anime in Minutes
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Four simple steps. No editing skills. No complicated setup.
            Just drop your study material and press play.
          </p>
        </div>

        {/* 4-step horizontal cards */}
        <div className="mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: '01',
              icon: Upload,
              title: 'Drop Your Material',
              desc: 'Upload lecture notes as PDF, paste a YouTube class URL, or type your own notes. Any subject, any language.',
              color: 'cyan',
              gradient: 'from-cyan-500 to-cyan-400',
              shadow: 'shadow-cyan-500/30',
              text: 'text-cyan-400',
              border: 'border-cyan-500/20',
              bg: 'bg-cyan-500/5',
            },
            {
              step: '02',
              icon: Palette,
              title: 'Pick Your Style',
              desc: 'Choose the anime aesthetic you like — from clean modern to retro 90s. Your episode, your vibe.',
              color: 'fuchsia',
              gradient: 'from-fuchsia-500 to-fuchsia-400',
              shadow: 'shadow-fuchsia-500/30',
              text: 'text-fuchsia-400',
              border: 'border-fuchsia-500/20',
              bg: 'bg-fuchsia-500/5',
            },
            {
              step: '03',
              icon: Sparkles,
              title: 'Hit Generate',
              desc: 'One button. AI writes the story, designs characters, adds voices and music, and renders your full episode automatically.',
              color: 'violet',
              gradient: 'from-violet-500 to-violet-400',
              shadow: 'shadow-violet-500/30',
              text: 'text-violet-400',
              border: 'border-violet-500/20',
              bg: 'bg-violet-500/5',
            },
            {
              step: '04',
              icon: Play,
              title: 'Watch and Learn',
              desc: 'Press play on your personalized anime episode. Complex concepts become memorable scenes you actually enjoy watching.',
              color: 'amber',
              gradient: 'from-amber-500 to-amber-400',
              shadow: 'shadow-amber-500/30',
              text: 'text-amber-400',
              border: 'border-amber-500/20',
              bg: 'bg-amber-500/5',
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
        <div className="mt-8 hidden items-center justify-center gap-2 text-zinc-600 lg:flex">
          <span className="text-xs tracking-widest uppercase text-zinc-500">Upload</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-xs tracking-widest uppercase text-zinc-500">Style</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-xs tracking-widest uppercase text-zinc-500">Generate</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-xs tracking-widest uppercase text-zinc-500">Watch</span>
        </div>
      </section>

      {/* ═══════════ SUBJECT GALLERY ═══════════ */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="al-reveal text-center">
          <Badge variant="outline" className="mb-4 border-cyan-500/30 bg-cyan-500/5 text-cyan-300">
            Any Subject
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Any Subject Becomes Unforgettable
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            From cell biology to Roman history — every topic gets its own cinematic treatment with characters, scenes, and storylines tailored to the material.
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          {[
            { name: 'Biology', image: '/landing/subject-biology.webp', desc: 'Cell structures and DNA come alive as explorable environments' },
            { name: 'History', image: '/landing/subject-history.webp', desc: 'Walk through ancient civilizations with narrator characters' },
            { name: 'Physics', image: '/landing/subject-physics.webp', desc: 'Visualize forces, orbits, and equations in cosmic scenes' },
            { name: 'Literature', image: '/landing/subject-literature.webp', desc: 'Watch Shakespeare and classic works performed on stage' },
          ].map((subject) => (
            <div
              key={subject.name}
              className="al-reveal group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40"
            >
              <div className="overflow-hidden">
                <Image
                  src={subject.image}
                  alt={`${subject.name} anime episode example`}
                  width={1280}
                  height={720}
                  className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#08080f] via-[#08080f]/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <Badge variant="outline" className="mb-2 border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs">
                  {subject.name}
                </Badge>
                <p className="text-sm text-zinc-300">{subject.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ STYLES ═══════════ */}
      <section id="styles" className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="al-reveal text-center">
          <Badge variant="outline" className="mb-4 border-amber-500/30 bg-amber-500/5 text-amber-300">
            Visual Identity
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Pick Your Anime Vibe
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Every subject deserves its own look. Choose the art style that matches how you want to experience the content.
          </p>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              name: 'Clean Modern',
              desc: 'Crisp lines, vibrant colors, sharp cel shading. The contemporary anime look.',
              image: '/landing/style-clean-modern.webp',
              border: 'border-cyan-500/20',
              accent: 'text-cyan-300',
              bg: 'bg-gradient-to-br from-cyan-950/40 to-blue-950/40',
            },
            {
              name: 'Soft Pastel',
              desc: 'Warm lighting, gentle gradients, watercolor influence. Dreamy and atmospheric.',
              image: '/landing/style-soft-pastel.webp',
              border: 'border-rose-500/20',
              accent: 'text-rose-300',
              bg: 'bg-gradient-to-br from-rose-950/40 to-pink-950/40',
            },
            {
              name: 'Dark Dramatic',
              desc: 'Deep shadows, intense backlighting, cinematic contrast. For serious topics.',
              image: '/landing/style-dark-dramatic.webp',
              border: 'border-violet-500/20',
              accent: 'text-violet-300',
              bg: 'bg-gradient-to-br from-violet-950/40 to-purple-950/40',
            },
            {
              name: 'Retro Classic',
              desc: '90s anime nostalgia. Thick outlines, film grain, limited palette. Timeless.',
              image: '/landing/style-retro-classic.webp',
              border: 'border-amber-500/20',
              accent: 'text-amber-300',
              bg: 'bg-gradient-to-br from-amber-950/40 to-orange-950/40',
            },
          ].map((style) => (
            <div
              key={style.name}
              className={`al-reveal group relative overflow-hidden rounded-2xl border ${style.border} ${style.bg} p-6 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-opacity-40`}
            >
              {/* preview image */}
              <div className="mb-5 overflow-hidden rounded-xl">
                <Image
                  src={style.image}
                  alt={`${style.name} anime style example`}
                  width={768}
                  height={960}
                  className="h-48 w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <h3 className={`text-base font-bold ${style.accent}`}>{style.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{style.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="al-reveal text-center">
          <Badge variant="outline" className="mb-4 border-cyan-500/30 bg-cyan-500/5 text-cyan-300">
            Why It Works
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Built for How You Actually Learn
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Anime storytelling makes complex ideas click. Your brain remembers stories better than bullet points.
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: BookOpen,
              title: 'Any Subject, Any Format',
              desc: 'Biology, history, math, programming — drop your PDF notes or paste a YouTube lecture. The AI adapts to your material.',
            },
            {
              icon: Users,
              title: 'Characters That Teach',
              desc: 'AI creates memorable characters that explain concepts through dialogue. Consistent design across every scene and episode.',
            },
            {
              icon: Mic,
              title: 'Real Voice Acting',
              desc: 'Each character speaks with their own unique voice and emotion. Narration guides you through the story naturally.',
            },
            {
              icon: Film,
              title: 'Cinematic Quality',
              desc: 'Animated video clips, camera movements, transitions, and a full soundtrack. Not a slideshow — a real production.',
            },
            {
              icon: Globe,
              title: 'Multiple Languages',
              desc: 'Generate episodes in English, Spanish, or Japanese. More languages coming soon. Natural pronunciation included.',
            },
            {
              icon: Zap,
              title: 'Ready in Minutes',
              desc: 'One click generates the full episode. No editing, no rendering, no waiting around. Upload and go study something else.',
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

      {/* ═══════════ PRICING ═══════════ */}
      <section id="pricing" className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="al-reveal text-center">
          <Badge variant="outline" className="mb-4 border-fuchsia-500/30 bg-fuchsia-500/5 text-fuchsia-300">
            Pricing
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Simple Pricing. No Surprises.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Choose the plan that fits your study load.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2 lg:max-w-4xl lg:mx-auto">
          {[
            {
              name: 'Creator',
              price: '29',
              period: '/mo',
              desc: 'For students who study regularly',
              features: [
                '5 episodes per month',
                '1080p output',
                'All 4 visual styles',
                'Full voice library',
                'Priority rendering',
                'Email support',
              ],
              cta: 'Start Creating',
              highlight: true,
            },
            {
              name: 'Pro',
              price: '89',
              period: '/mo',
              desc: 'For power users and study groups',
              features: [
                'Unlimited episodes',
                '4K output',
                'All 4 visual styles',
                'Full voice library',
                'Series continuity',
                'Priority support',
                'MP4 download',
              ],
              cta: 'Go Pro',
              highlight: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`al-reveal relative overflow-hidden rounded-2xl border p-8 transition-all duration-300 ${
                plan.highlight
                  ? 'border-cyan-500/30 bg-gradient-to-b from-cyan-950/30 via-zinc-900/60 to-fuchsia-950/20 shadow-xl shadow-cyan-500/5'
                  : 'border-zinc-800/80 bg-zinc-900/40'
              }`}
            >
              {plan.highlight ? (
                <div className="absolute -right-10 top-6 rotate-45 bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-12 py-1 text-xs font-bold text-white">
                  Popular
                </div>
              ) : null}

              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm text-zinc-500">{plan.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{`\u20AC${plan.price}`}</span>
                <span className="text-sm text-zinc-500">{plan.period}</span>
              </div>

              <Button
                asChild
                size="lg"
                className={`mt-8 w-full text-sm font-semibold ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg shadow-cyan-500/20'
                    : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                }`}
              >
                <Link href="/login">
                  {plan.cta}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>

              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-400">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-zinc-500">
          Want to try first?{' '}
          <Link href="/examples" className="text-cyan-400 hover:underline">
            Check out our example episodes
          </Link>{' '}
          — no account needed.
        </p>
      </section>

      {/* ═══════════ CTA FINAL ═══════════ */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="al-reveal relative overflow-hidden rounded-3xl border border-zinc-800/60 bg-gradient-to-br from-cyan-950/30 via-zinc-900/60 to-fuchsia-950/30 px-8 py-16 text-center sm:px-16">
          {/* decorative orbs */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-4xl">
            Stop Rereading. Start Watching.
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-zinc-400">
            Turn your hardest subjects into anime episodes you actually want to watch.
            Your next study session starts here.
          </p>
          <div className="relative mt-8">
            <Button asChild size="lg" className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-10 text-base font-semibold text-white shadow-xl shadow-cyan-500/25">
              <Link href="/login">
                Make My First Episode
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
            <span className="text-sm font-bold">AnimeLearn</span>
          </div>
          <div className="flex gap-6 text-sm text-zinc-500">
            <a href="#how" className="transition-colors hover:text-zinc-300">How It Works</a>
            <a href="#pricing" className="transition-colors hover:text-zinc-300">Pricing</a>
            <a href="mailto:hello@animelearn.com" className="transition-colors hover:text-zinc-300">Contact</a>
          </div>
          <p className="text-xs text-zinc-600">
            AnimeLearn 2026. All rights reserved.
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
