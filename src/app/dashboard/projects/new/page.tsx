import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Project</h2>
        <p className="text-muted-foreground">
          Upload a PDF or paste a YouTube URL to create anime episodes
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upload Content</CardTitle>
          <CardDescription>
            Supported: PDF files up to 50MB, YouTube URLs up to 60 minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Upload form coming in Phase 1...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
