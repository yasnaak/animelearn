export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Project Details</h2>
      <p className="text-muted-foreground">Project ID: {projectId}</p>
      <p className="text-sm text-muted-foreground">
        Project details and episode list coming in Phase 1...
      </p>
    </div>
  );
}
