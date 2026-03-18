'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Youtube, Loader2, CheckCircle2, AlertCircle, Sparkles, PenLine, Globe } from 'lucide-react';
import { toast } from 'sonner';

type UploadState = 'idle' | 'uploading' | 'extracting' | 'done' | 'error';
type SourceType = 'idea' | 'text' | 'pdf' | 'youtube' | 'url';

export default function NewProjectPage() {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<SourceType>('idea');
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('clean_modern');
  const [language, setLanguage] = useState('en');
  const [duration, setDuration] = useState('5');

  // Idea state
  const [ideaText, setIdeaText] = useState('');

  // Script state
  const [scriptText, setScriptText] = useState('');

  // PDF state
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [extractResult, setExtractResult] = useState<{
    numPages: number;
    textLength: number;
    title?: string;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // URL state
  const [webUrl, setWebUrl] = useState('');

  const createProject = trpc.project.create.useMutation();
  const extractYoutube = trpc.project.extractYoutube.useMutation();

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'application/pdf') {
      setFile(droppedFile);
      if (!title) setTitle(droppedFile.name.replace(/\.pdf$/i, ''));
    } else {
      toast.error('Only PDF files are supported');
    }
  }, [title]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        if (!title) setTitle(selectedFile.name.replace(/\.pdf$/i, ''));
      }
    },
    [title],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a project title');
      return;
    }

    // Validate per source type
    if (sourceType === 'idea' && ideaText.trim().length < 20) {
      toast.error('Please describe your idea in at least 20 characters');
      return;
    }
    if (sourceType === 'text' && scriptText.trim().length < 50) {
      toast.error('Please enter a longer script (at least 50 characters)');
      return;
    }
    if (sourceType === 'pdf' && !file) {
      toast.error('Please select a PDF file');
      return;
    }
    if (sourceType === 'youtube') {
      const url = youtubeUrl.trim();
      if (!url) {
        toast.error('Please enter a YouTube URL');
        return;
      }
      const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]+/;
      if (!ytRegex.test(url)) {
        toast.error('Please enter a valid YouTube URL (e.g. https://youtube.com/watch?v=...)');
        return;
      }
    }
    if (sourceType === 'url' && !webUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      const rawContent =
        sourceType === 'idea' ? ideaText.trim() :
        sourceType === 'text' ? scriptText.trim() :
        undefined;

      const sourceUrl =
        sourceType === 'youtube' ? youtubeUrl.trim() :
        sourceType === 'url' ? webUrl.trim() :
        undefined;

      const project = await createProject.mutateAsync({
        title: title.trim(),
        sourceType,
        sourceUrl,
        rawContent,
        style: style as 'clean_modern' | 'soft_pastel' | 'dark_dramatic' | 'retro_classic' | 'sketch_cartoon' | 'illustrated_cartoon',
        language,
        targetDurationMinutes: parseInt(duration, 10),
      });

      if (!project) {
        toast.error('Failed to create project');
        return;
      }

      // Upload PDF or extract YouTube transcript
      if (sourceType === 'pdf' && file) {
        setUploadState('uploading');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', project.id);
        setUploadState('extracting');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Upload failed');
        }

        const result = await res.json();
        setExtractResult(result);
        setUploadState('done');
        toast.success(
          `PDF processed: ${result.numPages} pages, ${Math.round(result.textLength / 1000)}K characters`,
        );
      } else if (sourceType === 'youtube' && youtubeUrl.trim()) {
        setUploadState('extracting');
        const result = await extractYoutube.mutateAsync({
          projectId: project.id,
          url: youtubeUrl.trim(),
        });
        setUploadState('done');
        const minutes = Math.round(result.durationSeconds / 60);
        toast.success(
          `YouTube transcript extracted: ${minutes} min video, ${Math.round(result.textLength / 1000)}K characters`,
        );
      }

      router.push(`/dashboard/projects/${project.id}`);
    } catch (error) {
      setUploadState('error');
      toast.error(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    }
  };

  const isSubmitting = createProject.isPending || extractYoutube.isPending || uploadState === 'uploading' || uploadState === 'extracting';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create Anime</h2>
        <p className="text-muted-foreground">
          Turn an idea, script, or any content into a full anime series
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Anime Episode"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Visual Style</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clean_modern">Clean Modern</SelectItem>
                    <SelectItem value="soft_pastel">Soft Pastel</SelectItem>
                    <SelectItem value="dark_dramatic">Dark Dramatic</SelectItem>
                    <SelectItem value="retro_classic">Retro Classic</SelectItem>
                    <SelectItem value="sketch_cartoon">Sketch Cartoon</SelectItem>
                    <SelectItem value="illustrated_cartoon">Illustrated Cartoon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Episode Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">~3 minutes</SelectItem>
                    <SelectItem value="5">~5 minutes</SelectItem>
                    <SelectItem value="10">~10 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Source</CardTitle>
            <CardDescription>
              Describe an idea, paste your own script, or import from a URL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={sourceType}
              onValueChange={(v) => setSourceType(v as SourceType)}
            >
              <TabsList className="w-full">
                <TabsTrigger value="idea" className="flex-1">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Idea
                </TabsTrigger>
                <TabsTrigger value="text" className="flex-1">
                  <PenLine className="mr-2 h-4 w-4" />
                  Script
                </TabsTrigger>
                <TabsTrigger value="youtube" className="flex-1">
                  <Youtube className="mr-2 h-4 w-4" />
                  YouTube
                </TabsTrigger>
                <TabsTrigger value="pdf" className="flex-1">
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </TabsTrigger>
                <TabsTrigger value="url" className="flex-1">
                  <Globe className="mr-2 h-4 w-4" />
                  URL
                </TabsTrigger>
              </TabsList>

              {/* Idea Tab */}
              <TabsContent value="idea" className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="idea">Describe your anime story</Label>
                  <Textarea
                    id="idea"
                    value={ideaText}
                    onChange={(e) => setIdeaText(e.target.value)}
                    placeholder="A samurai who discovers modern-day Tokyo through a time portal. He must learn to navigate the city while being hunted by a secret organization that knows about the portal..."
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe the story, characters, setting, and tone. The more detail, the better the result.
                  </p>
                </div>
              </TabsContent>

              {/* Script Tab */}
              <TabsContent value="text" className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="script">Paste your script or story</Label>
                  <Textarea
                    id="script"
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    placeholder="INT. ABANDONED WAREHOUSE - NIGHT&#10;&#10;YUKI (17, silver hair, determined eyes) stands alone in the center of the room. The moonlight casts long shadows through broken windows.&#10;&#10;YUKI: (whispering) They said no one comes back from the Shadow Realm. They were wrong."
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste a full script, story outline, or narrative. AI will turn it into an anime series.
                  </p>
                </div>
              </TabsContent>

              {/* YouTube Tab */}
              <TabsContent value="youtube" className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="youtube-url">YouTube URL</Label>
                  <Input
                    id="youtube-url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We extract the transcript (or transcribe the audio with AI) and turn it into an anime series.
                </p>
              </TabsContent>

              {/* PDF Tab */}
              <TabsContent value="pdf" className="mt-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                    dragOver
                      ? 'border-primary bg-primary/5'
                      : file
                        ? 'border-green-500 bg-green-500/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
                >
                  {file ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFile(null);
                          setUploadState('idle');
                          setExtractResult(null);
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        Drag & drop a PDF here, or click to browse
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Max 50MB
                      </p>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleFileSelect}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                    </>
                  )}
                </div>

                {uploadState === 'extracting' && sourceType === 'pdf' && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting text from PDF...
                  </div>
                )}

                {extractResult && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {extractResult.numPages} pages,{' '}
                    {Math.round(extractResult.textLength / 1000)}K characters
                    extracted
                  </div>
                )}

                {uploadState === 'error' && sourceType === 'pdf' && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Failed to process PDF. Please try again.
                  </div>
                )}
              </TabsContent>

              {/* URL Tab */}
              <TabsContent value="url" className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="web-url">Article or Blog URL</Label>
                  <Input
                    id="web-url"
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                    placeholder="https://example.com/my-article"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste any article, blog post, or web page URL. AI will extract and turn it into an anime series.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploadState === 'extracting'
                  ? sourceType === 'youtube'
                    ? 'Extracting transcript...'
                    : 'Processing...'
                  : 'Creating project...'}
              </>
            ) : (
              'Create Anime'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
