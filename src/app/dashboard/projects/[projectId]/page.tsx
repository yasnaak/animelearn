'use client';

import { use, useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Trash2,
  Loader2,
  Play,
  CheckCircle2,
  AlertCircle,
  Wand2,
  PenLine,
  Palette,
  Film,
  Music,
  PartyPopper,
  Share2,
  Copy,
  Globe,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { estimateTokens } from '@/server/services/text-chunker';

/* ── Friendly step labels for progress display ── */
const STEP_LABELS: Record<string, { label: string; detail: string }> = {
  // V1 (legacy) steps
  script: {
    label: 'Writing the script',
    detail: 'AI is crafting dialogue, characters, and scenes from your material',
  },
  visual_prompts: {
    label: 'Planning the visuals',
    detail: 'Composing each scene with backgrounds, characters, and effects',
  },
  video_clips: {
    label: 'Animating scenes',
    detail: 'Generating cinematic video clips for every panel',
  },
  // V2 (shot-based) steps
  screenplay: {
    label: 'Writing the screenplay',
    detail: 'AI is crafting a cinematic anime screenplay with shots, dialogue, and camera directions',
  },
  locations: {
    label: 'Creating locations',
    detail: 'Generating reference images for each unique location to ensure visual consistency',
  },
  characters: {
    label: 'Designing characters',
    detail: 'Creating detailed character sheets with signature features for consistency',
  },
  shot_images: {
    label: 'Composing shots',
    detail: 'Generating each camera shot with IP-Adapter references for visual consistency',
  },
  shot_animation: {
    label: 'Animating shots',
    detail: 'Transforming still shots into cinematic video clips with camera movement',
  },
  // Shared steps
  audio_direction: {
    label: 'Planning the audio',
    detail: 'Assigning voices, music cues, and sound effects to each scene',
  },
  audio: {
    label: 'Recording voices and music',
    detail: 'Generating expressive dialogue, narration, background music, and sound effects',
  },
  music: {
    label: 'Composing the soundtrack',
    detail: 'Creating original background music for your episode',
  },
  finishing: {
    label: 'Final touches',
    detail: 'Assembling everything into your complete anime episode',
  },
  complete: {
    label: 'Episode ready',
    detail: 'Your anime episode is ready to watch',
  },
};

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all duration-700 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function GenerationProgress({
  episodeId,
  onComplete,
}: {
  episodeId: string;
  onComplete: () => void;
}) {
  const { data: job } = trpc.generation.getProgress.useQuery(
    { episodeId },
    { refetchInterval: 2000 },
  );

  useEffect(() => {
    if (job?.currentStep === 'complete') {
      onComplete();
    }
  }, [job?.currentStep, onComplete]);

  if (!job) return null;

  const stepInfo = STEP_LABELS[job.currentStep ?? ''] ?? {
    label: 'Preparing...',
    detail: 'Setting things up',
  };
  const completedSteps = (job.stepsCompleted as string[]) ?? [];
  const isComplete = job.currentStep === 'complete';
  const isFailed = !!job.error;

  const allSteps = [
    { key: 'script', icon: PenLine, label: 'Script' },
    { key: 'characters', icon: Palette, label: 'Characters' },
    { key: 'visual_prompts', icon: Sparkles, label: 'Visuals' },
    { key: 'video_clips', icon: Film, label: 'Animation' },
    { key: 'audio', icon: Music, label: 'Audio' },
  ];

  return (
    <Card className="border-cyan-500/20 bg-gradient-to-b from-cyan-950/10 to-transparent">
      <CardContent className="pt-6">
        {/* Main status */}
        <div className="mb-4 flex items-center gap-3">
          {isComplete ? (
            <PartyPopper className="h-6 w-6 text-green-400" />
          ) : isFailed ? (
            <AlertCircle className="h-6 w-6 text-destructive" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          )}
          <div>
            <p className="font-semibold">
              {isFailed ? 'Generation failed' : stepInfo.label}
            </p>
            <p className="text-sm text-muted-foreground">
              {isFailed ? job.error : stepInfo.detail}
            </p>
          </div>
          {!isComplete && !isFailed && (
            <span className="ml-auto font-mono text-sm text-muted-foreground">
              {job.progress}%
            </span>
          )}
        </div>

        {/* Progress bar */}
        <ProgressBar progress={job.progress ?? 0} />

        {/* Step indicators */}
        <div className="mt-5 flex justify-between">
          {allSteps.map((step) => {
            const done = completedSteps.includes(step.key);
            const active = job.currentStep === step.key || job.currentStep === step.key + '_prompts';
            return (
              <div
                key={step.key}
                className={`flex flex-col items-center gap-1.5 text-xs ${
                  done
                    ? 'text-green-400'
                    : active
                      ? 'text-cyan-400'
                      : 'text-muted-foreground/50'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    done
                      ? 'bg-green-500/10'
                      : active
                        ? 'bg-cyan-500/10'
                        : 'bg-muted/50'
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ShareButton({
  episodeId,
  projectId,
  isPublic: initialPublic,
}: {
  episodeId: string;
  projectId: string;
  isPublic: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(initialPublic);
  const utils = trpc.useUtils();

  const togglePublic = trpc.generation.togglePublic.useMutation({
    onSuccess: (result) => {
      setIsPublic(result.isPublic);
      utils.generation.listEpisodes.invalidate({ projectId });
      toast.success(
        result.isPublic ? 'Episode is now public' : 'Episode is now private',
      );
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/watch/${episodeId}`
      : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard');
  };

  const handleToggle = () => {
    togglePublic.mutate({
      projectId,
      episodeId,
      isPublic: !isPublic,
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-4 w-4" />
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="mx-4 w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Share Episode</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Share this episode with anyone via a direct link.
            </p>

            {/* Public toggle */}
            <div className="mt-5 flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Globe className="h-4 w-4 text-green-400" />
                ) : (
                  <Lock className="h-4 w-4 text-zinc-500" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {isPublic ? 'Public' : 'Private'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isPublic
                      ? 'Anyone with the link can watch'
                      : 'Only you can watch this episode'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggle}
                disabled={togglePublic.isPending}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  isPublic ? 'bg-green-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    isPublic ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Share URL */}
            <div className="mt-4">
              <label className="text-xs text-muted-foreground">
                Episode link
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300"
                />
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="mr-1 h-3 w-3" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: project, isLoading } = trpc.project.get.useQuery({
    id: projectId,
  });
  const { data: episodesList } = trpc.generation.listEpisodes.useQuery(
    { projectId },
    { enabled: !!project?.seriesPlan },
  );

  const deleteProject = trpc.project.delete.useMutation();
  const analyzeContentMutation = trpc.generation.analyzeContent.useMutation({
    onError: (error) => {
      toast.error(`Analysis failed: ${error.message}`);
      utils.project.get.invalidate({ id: projectId });
    },
  });
  const planFromAnalysisMutation = trpc.generation.planFromAnalysis.useMutation({
    onSuccess: () => {
      toast.success('Content analyzed! Episodes are ready to generate.');
      utils.project.get.invalidate({ id: projectId });
      utils.generation.listEpisodes.invalidate({ projectId });
    },
    onError: (error) => {
      toast.error(`Planning failed: ${error.message}`);
      utils.project.get.invalidate({ id: projectId });
    },
  });

  const generateEpisodeMutation = trpc.generation.generateEpisodeV2.useMutation({
    onSuccess: () => {
      toast.success('Episode generated successfully!');
      utils.generation.listEpisodes.invalidate({ projectId });
    },
    onError: (error) => {
      toast.error(`Generation failed: ${error.message}`);
      utils.generation.listEpisodes.invalidate({ projectId });
    },
  });

  const [generatingAll, setGeneratingAll] = useState(false);

  const handleDelete = async () => {
    const result = await deleteProject.mutateAsync({ id: projectId });
    if (result.success) {
      toast.success('Project deleted');
      utils.project.list.invalidate();
      router.push('/dashboard');
    }
  };

  const [analyzePhase, setAnalyzePhase] = useState<'idle' | 'analyzing' | 'planning'>('idle');

  const handleAnalyze = async () => {
    setAnalyzePhase('analyzing');
    try {
      await analyzeContentMutation.mutateAsync({ projectId });
      setAnalyzePhase('planning');
      await planFromAnalysisMutation.mutateAsync({ projectId });
      setAnalyzePhase('idle');
    } catch {
      setAnalyzePhase('idle');
      utils.project.get.invalidate({ id: projectId });
    }
  };

  const handleGenerateEpisode = (episodeNumber: number) => {
    generateEpisodeMutation.mutate({ projectId, episodeNumber });
  };

  const handleGenerateAll = async () => {
    if (!episodesList) return;
    const planned = episodesList.filter((ep) => ep.status === 'planned');
    if (planned.length === 0) return;
    setGeneratingAll(true);
    for (const ep of planned) {
      try {
        await generateEpisodeMutation.mutateAsync({
          projectId,
          episodeNumber: ep.episodeNumber,
        });
      } catch {
        // Individual episode errors are already toasted
      }
    }
    setGeneratingAll(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Project not found</p>
        <Button asChild variant="link" className="mt-2">
          <Link href="/dashboard">Back to projects</Link>
        </Button>
      </div>
    );
  }

  const tokenCount = project.rawContent
    ? estimateTokens(project.rawContent)
    : 0;

  const planData = project.seriesPlan as Record<string, unknown> | null;
  const isAnalyzing = analyzePhase !== 'idle' || project.status === 'analyzing' || project.status === 'analyzed' || project.status === 'planning';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">
            {project.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {{ pdf: 'PDF', youtube: 'YouTube', idea: 'Idea', text: 'Script', url: 'URL' }[project.sourceType] ?? project.sourceType} &middot;{' '}
            {project.style.replace('_', ' ')} &middot; {project.language}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={deleteProject.isPending}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this project?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the project, all episodes, and generated content. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteProject.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
                ) : (
                  'Delete Project'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Step 1: Content uploaded — show analyze button */}
      {project.rawContent && !planData ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content Ready
            </CardTitle>
            <CardDescription>
              {project.rawContent.length.toLocaleString()} characters
              &middot; ~{tokenCount.toLocaleString()} tokens from your {{ pdf: 'PDF', youtube: 'YouTube video', idea: 'idea', text: 'script', url: 'URL' }[project.sourceType] ?? 'content'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 max-h-40 overflow-y-auto rounded-md bg-muted/50 p-4">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {project.rawContent.slice(0, 1500)}
                {project.rawContent.length > 1500 && (
                  <span className="text-muted-foreground/60">
                    {'\n\n'}... ({(project.rawContent.length - 1500).toLocaleString()} more characters)
                  </span>
                )}
              </pre>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              size="lg"
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {analyzePhase === 'planning' || project.status === 'planning' || project.status === 'analyzed'
                    ? 'Planning episodes...'
                    : 'Analyzing your content...'}
                </>
              ) : project.status === 'failed' ? (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Retry Analysis
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Analyze Content and Plan Episodes
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : !project.rawContent ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-amber-500" />
            <h3 className="mt-4 text-lg font-semibold">No content found</h3>
            <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
              Content could not be extracted from your source. Please try creating a new project.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/dashboard/projects/new">Create New Project</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Step 2: Plan ready — show series info + episodes with generate buttons */}
      {planData ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <CardTitle>
                    {(planData.series as Record<string, unknown>)?.title as string || 'Your Series'}
                  </CardTitle>
                  <CardDescription>
                    {(planData.series as Record<string, unknown>)?.total_episodes as number || 0} episodes planned from your content
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Separator />

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Episodes</h3>
              {episodesList && episodesList.some((ep) => ep.status === 'planned') && (
                <Button
                  onClick={handleGenerateAll}
                  disabled={generateEpisodeMutation.isPending || generatingAll}
                  className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg shadow-cyan-500/10"
                >
                  {generatingAll ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating all...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate All Episodes
                    </>
                  )}
                </Button>
              )}
            </div>
            {episodesList && episodesList.length > 0 ? (
              <div className="space-y-4">
                {episodesList.map((ep) => {
                  const isGenerating =
                    generateEpisodeMutation.isPending &&
                    generateEpisodeMutation.variables?.episodeNumber === ep.episodeNumber;
                  const isInProgress =
                    ep.status !== 'planned' &&
                    ep.status !== 'ready' &&
                    ep.status !== 'failed';
                  const isReady = ep.status === 'ready';
                  const isFailed = ep.status === 'failed';

                  return (
                    <Card key={ep.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">
                              Episode {ep.episodeNumber}: {ep.title}
                            </CardTitle>
                            {ep.synopsis && (
                              <CardDescription className="mt-1">
                                {ep.synopsis}
                              </CardDescription>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isReady && (
                              <Badge className="bg-green-500/10 text-green-400">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Ready
                              </Badge>
                            )}
                            {isFailed && (
                              <Badge variant="destructive">
                                <AlertCircle className="mr-1 h-3 w-3" />
                                Failed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        {/* Progress UI when generating */}
                        {(isInProgress || isGenerating) && (
                          <GenerationProgress
                            episodeId={ep.id}
                            onComplete={() => {
                              utils.generation.listEpisodes.invalidate({ projectId });
                            }}
                          />
                        )}

                        {/* Generate button for planned episodes */}
                        {ep.status === 'planned' && !isGenerating && (
                          <Button
                            onClick={() => handleGenerateEpisode(ep.episodeNumber)}
                            disabled={generateEpisodeMutation.isPending}
                            className="w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg shadow-cyan-500/10"
                            size="lg"
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate This Episode
                          </Button>
                        )}

                        {/* Watch + Share buttons for ready episodes */}
                        {isReady && (
                          <div className="flex gap-2">
                            <Button
                              asChild
                              variant="outline"
                              className="flex-1"
                              size="lg"
                            >
                              <Link href={`/watch/${ep.id}`}>
                                <Play className="mr-2 h-4 w-4" />
                                Watch Episode
                              </Link>
                            </Button>
                            <ShareButton
                              episodeId={ep.id}
                              projectId={projectId}
                              isPublic={ep.isPublic}
                            />
                          </div>
                        )}

                        {/* Retry for failed episodes */}
                        {isFailed && (
                          <>
                            {ep.generationError && (
                              <p className="text-sm text-destructive">
                                {ep.generationError}
                              </p>
                            )}
                            <Button
                              onClick={() => handleGenerateEpisode(ep.episodeNumber)}
                              disabled={generateEpisodeMutation.isPending}
                              variant="outline"
                              className="w-full"
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              Retry Generation
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Loading episodes...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
