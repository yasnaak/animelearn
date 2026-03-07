'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Upload, FileText, Youtube, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type UploadState = 'idle' | 'uploading' | 'extracting' | 'done' | 'error';

export default function NewProjectPage() {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<'pdf' | 'youtube'>('pdf');
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('clean_modern');
  const [language, setLanguage] = useState('en');

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

  const createProject = trpc.project.create.useMutation();

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

    try {
      // 1. Create the project
      const project = await createProject.mutateAsync({
        title: title.trim(),
        sourceType,
        sourceUrl: sourceType === 'youtube' ? youtubeUrl.trim() : undefined,
        style: style as 'clean_modern' | 'soft_pastel' | 'dark_dramatic' | 'retro_classic',
        language,
      });

      if (!project) {
        toast.error('Failed to create project');
        return;
      }

      // 2. Upload PDF if applicable
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
      }

      // 3. Navigate to project
      router.push(`/dashboard/projects/${project.id}`);
    } catch (error) {
      setUploadState('error');
      toast.error(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Project</h2>
        <p className="text-muted-foreground">
          Upload a PDF or paste a YouTube URL to create anime episodes
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
                placeholder="My Awesome Course"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Source</CardTitle>
            <CardDescription>
              Upload a PDF or paste a YouTube URL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={sourceType}
              onValueChange={(v) => setSourceType(v as 'pdf' | 'youtube')}
            >
              <TabsList className="w-full">
                <TabsTrigger value="pdf" className="flex-1">
                  <FileText className="mr-2 h-4 w-4" />
                  PDF Upload
                </TabsTrigger>
                <TabsTrigger value="youtube" className="flex-1">
                  <Youtube className="mr-2 h-4 w-4" />
                  YouTube URL
                </TabsTrigger>
              </TabsList>

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

                {uploadState === 'extracting' && (
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

                {uploadState === 'error' && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Failed to process PDF. Please try again.
                  </div>
                )}
              </TabsContent>

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
                <p className="text-xs text-amber-500">
                  YouTube transcript extraction is coming soon. For now, please use PDF upload.
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
            disabled={
              createProject.isPending || uploadState === 'uploading' || uploadState === 'extracting'
            }
            className="flex-1"
          >
            {createProject.isPending || uploadState === 'uploading' || uploadState === 'extracting' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploadState === 'extracting'
                  ? 'Processing PDF...'
                  : 'Creating project...'}
              </>
            ) : (
              'Create Project'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
