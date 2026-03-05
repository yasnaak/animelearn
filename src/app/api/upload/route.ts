import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { extractPDFText } from '@/server/services/pdf-extractor';
import { db } from '@/server/db';
import { projects } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const projectId = formData.get('projectId') as string | null;

  if (!file || !projectId) {
    return NextResponse.json(
      { error: 'File and projectId are required' },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large (max 50MB)' },
      { status: 400 },
    );
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json(
      { error: 'Only PDF files are supported' },
      { status: 400 },
    );
  }

  // Verify project ownership
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project[0] || project[0].userId !== session.user.id) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { text, numPages } = await extractPDFText(buffer);

    if (!text || text.length < 50) {
      return NextResponse.json(
        { error: 'Could not extract meaningful text from PDF. The file may be scanned/image-based.' },
        { status: 422 },
      );
    }

    // Update project with extracted content
    await db
      .update(projects)
      .set({
        rawContent: text,
        description: `PDF with ${numPages} page${numPages !== 1 ? 's' : ''}`,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    return NextResponse.json({
      success: true,
      numPages,
      textLength: text.length,
    });
  } catch (error) {
    console.error('PDF extraction failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to process PDF: ${message}` },
      { status: 500 },
    );
  }
}
