export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const results: Record<string, string> = {};
  const url = new URL(req.url);
  const test = url.searchParams.get('test');

  results.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL
    ? `"${process.env.BETTER_AUTH_URL}" (len: ${process.env.BETTER_AUTH_URL.length})`
    : 'MISSING';

  if (test === 'api') {
    try {
      const { auth } = await import('@/lib/auth');
      const res = await auth.api.signInEmail({
        body: { email: 'yasnaeim@gmail.com', password: 'Hola123.!' },
      });
      results.api = JSON.stringify(res).substring(0, 500);
    } catch (e) {
      results.api = `ERROR: ${String(e)}`;
    }
  }

  if (test === 'handler') {
    try {
      const { auth } = await import('@/lib/auth');
      const fakeReq = new Request(
        'https://animelearn.vercel.app/api/auth/sign-in/email',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'yasnaeim@gmail.com', password: 'Hola123.!' }),
        },
      );
      const res = await auth.handler(fakeReq);
      const body = await res.text();
      results.handlerStatus = String(res.status);
      results.handlerBody = body.substring(0, 500) || '(empty)';
      results.handlerHeaders = JSON.stringify(Object.fromEntries(res.headers.entries())).substring(0, 500);
    } catch (e) {
      results.handler = `ERROR: ${String(e)}`;
      results.handlerStack = (e as Error).stack?.substring(0, 300) || '';
    }
  }

  return Response.json(results, { status: 200 });
}

export async function POST() {
  return Response.json({ msg: 'Use GET with ?test=api or ?test=handler' });
}
