export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, string> = {};

  // Check env vars
  results.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL
    ? `"${process.env.BETTER_AUTH_URL}" (len: ${process.env.BETTER_AUTH_URL.length})`
    : 'MISSING';
  results.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ? 'SET' : 'MISSING';
  results.DATABASE_URL = process.env.DATABASE_URL ? 'SET' : 'MISSING';

  // Try loading DB
  try {
    const { db } = await import('@/server/db');
    const { sql } = await import('drizzle-orm');
    await db.execute(sql`SELECT 1 as ok`);
    results.db = 'OK';
  } catch (e) {
    results.db = `ERROR: ${String(e)}`;
  }

  // Try loading auth
  try {
    const { auth } = await import('@/lib/auth');
    results.auth = 'OK';
    results.authBaseURL = (auth as unknown as { options?: { baseURL?: string } }).options?.baseURL || 'not set';
  } catch (e) {
    results.auth = `ERROR: ${String(e)}`;
  }

  // Try loading handler
  try {
    const { auth } = await import('@/lib/auth');
    const { toNextJsHandler } = await import('better-auth/next-js');
    const handler = toNextJsHandler(auth);
    results.handler = typeof handler.POST === 'function' ? 'OK (has POST)' : 'MISSING POST';
  } catch (e) {
    results.handler = `ERROR: ${String(e)}`;
  }

  return Response.json(results, { status: 200 });
}
