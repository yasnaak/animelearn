export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const results: Record<string, string> = {};
  const url = new URL(req.url);
  const test = url.searchParams.get('test');

  results.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL
    ? `"${process.env.BETTER_AUTH_URL}" (len: ${process.env.BETTER_AUTH_URL.length})`
    : 'MISSING';
  results.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ? 'SET' : 'MISSING';
  results.DATABASE_URL = process.env.DATABASE_URL ? 'SET' : 'MISSING';

  if (test === 'signin') {
    try {
      const { auth } = await import('@/lib/auth');
      const res = await auth.api.signInEmail({
        body: { email: 'yasnaeim@gmail.com', password: 'Hola123.!' },
      });
      results.signIn = JSON.stringify(res).substring(0, 500);
    } catch (e) {
      results.signIn = `ERROR: ${String(e)}`;
      results.signInStack = (e as Error).stack?.substring(0, 500) || '';
    }
  }

  if (test === 'handler') {
    try {
      const { auth } = await import('@/lib/auth');
      const { toNextJsHandler } = await import('better-auth/next-js');
      const handler = toNextJsHandler(auth);

      const fakeReq = new Request('https://animelearn.vercel.app/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'yasnaeim@gmail.com', password: 'Hola123.!' }),
      });

      const res = await handler.POST(fakeReq);
      const body = await res.text();
      results.handlerStatus = String(res.status);
      results.handlerBody = body.substring(0, 500) || '(empty)';
      results.handlerHeaders = JSON.stringify(
        Object.fromEntries(res.headers.entries()),
      ).substring(0, 500);
    } catch (e) {
      results.handlerTest = `ERROR: ${String(e)}`;
      results.handlerStack = (e as Error).stack?.substring(0, 500) || '';
    }
  }

  return Response.json(results, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = new URL(req.url);
    return Response.json({
      received: true,
      body,
      url: url.pathname,
      headers: {
        contentType: req.headers.get('content-type'),
        origin: req.headers.get('origin'),
        host: req.headers.get('host'),
      },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
