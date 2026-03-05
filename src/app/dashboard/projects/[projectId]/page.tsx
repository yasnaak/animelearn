'use client';

import { use } from 'react';
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
  ArrowLeft,
  FileText,
  Sparkles,
  Trash2,
  Loader2,
  BookOpen,
  Play,
  CheckCircle2,
  AlertCircle,
  Image,
  Palette,
  Users,
  Volume2,
  Music,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { estimateTokens } from '@/server/services/text-chunker';

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
  const analyzeMutation = trpc.generation.analyze.useMutation({
    onSuccess: () => {
      toast.success('Analysis and planning complete!');
      utils.project.get.invalidate({ id: projectId });
      utils.generation.listEpisodes.invalidate({ projectId });
    },
    onError: (error) => {
      toast.error(`Analysis failed: ${error.message}`);
      utils.project.get.invalidate({ id: projectId });
    },
  });
  const scriptMutation = trpc.generation.generateScript.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Script generated! Validation: ${data.validation.coverage_score}% coverage`,
      );
      utils.generation.listEpisodes.invalidate({ projectId });
    },
    onError: (error) => {
      toast.error(`Script generation failed: ${error.message}`);
      utils.generation.listEpisodes.invalidate({ projectId });
    },
  });

  const charSheetsMutation = trpc.visuals.generateCharacterSheets.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.characters.length} character sheets generated!`);
      utils.visuals.listCharacters.invalidate({ projectId });
    },
    onError: (error) => toast.error(`Character sheets failed: ${error.message}`),
  });
  const visualPromptsMutation = trpc.visuals.generateVisualPrompts.useMutation({
    onSuccess: () => {
      toast.success('Visual prompts generated!');
      utils.generation.listEpisodes.invalidate({ projectId });
    },
    onError: (error) => toast.error(`Visual prompts failed: ${error.message}`),
  });
  const panelImagesMutation = trpc.visuals.generatePanelImages.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.panels.length} panel images generated!`);
      utils.generation.listEpisodes.invalidate({ projectId });
    },
    onError: (error) => toast.error(`Panel generation failed: ${error.message}`),
  });

  const audioDirectionMutation = trpc.audio.generateDirection.useMutation({
    onSuccess: () => {
      toast.success('Audio direction generated!');
      utils.generation.listEpisodes.invalidate({ projectId });
    },
    onError: (error) => toast.error(`Audio direction failed: ${error.message}`),
  });
  const generateAudioMutation = trpc.audio.generateAudio.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.tracksGenerated} audio tracks generated!`);
      utils.generation.listEpisodes.invalidate({ projectId });
    },
    onError: (error) => toast.error(`Audio generation failed: ${error.message}`),
  });

  const { data: charactersList } = trpc.visuals.listCharacters.useQuery(
    { projectId },
    { enabled: !!project?.seriesPlan },
  );

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    const result = await deleteProject.mutateAsync({ id: projectId });
    if (result.success) {
      toast.success('Project deleted');
      utils.project.list.invalidate();
      router.push('/dashboard');
    }
  };

  const handleAnalyze = () => {
    analyzeMutation.mutate({ projectId });
  };

  const handleGenerateScript = (episodeNumber: number) => {
    scriptMutation.mutate({ projectId, episodeNumber });
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

  const analysisData = project.contentAnalysis as Record<string, unknown> | null;
  const planData = project.seriesPlan as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
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
            {project.sourceType === 'pdf' ? 'PDF' : 'YouTube'} &middot;{' '}
            {project.style.replace('_', ' ')} &middot; {project.language}
          </p>
        </div>
        <Badge
          variant={
            project.status === 'completed'
              ? 'default'
              : project.status === 'failed'
                ? 'destructive'
                : 'secondary'
          }
        >
          {project.status}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={deleteProject.isPending}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* Extracted Content */}
      {project.rawContent ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Extracted Content
                  </CardTitle>
                  <CardDescription>
                    {project.rawContent.length.toLocaleString()} characters
                    &middot; ~{tokenCount.toLocaleString()} tokens
                  </CardDescription>
                </div>
                {project.status === 'draft' && (
                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzeMutation.isPending}
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Analyze & Plan
                      </>
                    )}
                  </Button>
                )}
                {project.status === 'analyzing' && (
                  <Badge variant="secondary" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Analyzing...
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto rounded-md bg-muted/50 p-4">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                  {project.rawContent.slice(0, 3000)}
                  {project.rawContent.length > 3000 && (
                    <span className="text-muted-foreground">
                      {'\n\n'}... (
                      {(project.rawContent.length - 3000).toLocaleString()} more
                      characters)
                    </span>
                  )}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Content Analysis */}
          {analysisData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Content Analysis
                </CardTitle>
                <CardDescription>
                  {(analysisData.metadata as Record<string, unknown>)?.total_concepts as number || 0} concepts identified &middot;{' '}
                  {(analysisData.metadata as Record<string, unknown>)?.estimated_level as string || 'unknown'} level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto rounded-md bg-muted/50 p-4">
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(analysisData, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Series Plan */}
          {planData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  Series Plan
                </CardTitle>
                <CardDescription>
                  {(planData.series as Record<string, unknown>)?.title as string || 'Untitled'} &mdash;{' '}
                  {(planData.series as Record<string, unknown>)?.total_episodes as number || 0} episodes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto rounded-md bg-muted/50 p-4">
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(planData, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No content yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.sourceType === 'pdf'
                ? 'PDF text extraction pending'
                : 'YouTube transcript extraction pending'}
            </p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Characters */}
      {charactersList && charactersList.length > 0 ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Characters</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => charSheetsMutation.mutate({ projectId })}
              disabled={charSheetsMutation.isPending}
            >
              {charSheetsMutation.isPending ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Generating sheets...
                </>
              ) : (
                <>
                  <Users className="mr-1 h-3 w-3" />
                  Generate Character Sheets
                </>
              )}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {charactersList.map((char) => (
              <Card key={char.id} className="overflow-hidden">
                {char.characterSheetUrl ? (
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={char.characterSheetUrl}
                      alt={char.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{char.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {char.role}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      <Separator />

      {/* Episodes */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Episodes</h3>
        {episodesList && episodesList.length > 0 ? (
          <div className="space-y-3">
            {episodesList.map((ep) => (
              <Card key={ep.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
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
                      <Badge
                        variant={
                          ep.status === 'ready'
                            ? 'default'
                            : ep.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {ep.status}
                      </Badge>

                      {/* Step 1: Generate Script */}
                      {ep.status === 'planned' ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleGenerateScript(ep.episodeNumber)
                          }
                          disabled={scriptMutation.isPending}
                        >
                          {scriptMutation.isPending &&
                          scriptMutation.variables?.episodeNumber ===
                            ep.episodeNumber ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Script...
                            </>
                          ) : (
                            <>
                              <Play className="mr-1 h-3 w-3" />
                              Generate Script
                            </>
                          )}
                        </Button>
                      ) : null}

                      {/* Step 2: Generate Visual Prompts */}
                      {ep.script && !ep.visualPrompts ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            visualPromptsMutation.mutate({
                              projectId,
                              episodeId: ep.id,
                            })
                          }
                          disabled={visualPromptsMutation.isPending}
                        >
                          {visualPromptsMutation.isPending ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Prompts...
                            </>
                          ) : (
                            <>
                              <Palette className="mr-1 h-3 w-3" />
                              Visual Prompts
                            </>
                          )}
                        </Button>
                      ) : null}

                      {/* Step 3: Generate Panel Images */}
                      {ep.visualPrompts && ep.status !== 'audio' && ep.status !== 'ready' && ep.status !== 'composing' ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            panelImagesMutation.mutate({
                              projectId,
                              episodeId: ep.id,
                            })
                          }
                          disabled={panelImagesMutation.isPending}
                        >
                          {panelImagesMutation.isPending ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Generating images...
                            </>
                          ) : (
                            <>
                              <Image className="mr-1 h-3 w-3" />
                              Generate Images
                            </>
                          )}
                        </Button>
                      ) : null}

                      {/* Step 4: Audio Direction */}
                      {ep.status === 'audio' && !ep.audioDirection ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            audioDirectionMutation.mutate({
                              projectId,
                              episodeId: ep.id,
                            })
                          }
                          disabled={audioDirectionMutation.isPending}
                        >
                          {audioDirectionMutation.isPending ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Direction...
                            </>
                          ) : (
                            <>
                              <Music className="mr-1 h-3 w-3" />
                              Audio Direction
                            </>
                          )}
                        </Button>
                      ) : null}

                      {/* Step 5: Generate Audio */}
                      {ep.audioDirection && ep.status !== 'composing' && ep.status !== 'ready' ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            generateAudioMutation.mutate({
                              projectId,
                              episodeId: ep.id,
                            })
                          }
                          disabled={generateAudioMutation.isPending}
                        >
                          {generateAudioMutation.isPending ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Generating audio...
                            </>
                          ) : (
                            <>
                              <Volume2 className="mr-1 h-3 w-3" />
                              Generate Audio
                            </>
                          )}
                        </Button>
                      ) : null}

                      {ep.status === 'failed' && ep.generationError ? (
                        <span className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          {ep.generationError.slice(0, 50)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                {ep.script ? (
                  <CardContent>
                    <div className="max-h-48 overflow-y-auto rounded-md bg-muted/50 p-3">
                      <pre className="whitespace-pre-wrap text-xs">
                        {JSON.stringify(ep.script, null, 2).slice(0, 2000)}
                        ...
                      </pre>
                    </div>
                  </CardContent>
                ) : null}
              </Card>
            ))}
          </div>
        ) : project.seriesPlan ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Loading episodes...
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">
                {project.rawContent
                  ? 'Click "Analyze & Plan" to generate episode structure'
                  : 'Upload content first to generate episodes'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
