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
    }
  }

  return Response.json(results, { status: 200 });
}

export async function POST(req: Request) {
  // Proxy auth handler via this debug endpoint
  try {
    const body = await req.text();
    const url = new URL(req.url);
    const authPath = url.searchParams.get('path') || '/api/auth/sign-in/email';

    const { auth } = await import('@/lib/auth');

    const fakeReq = new Request(
      `https://animelearn.vercel.app${authPath}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      },
    );

    const res = await auth.handler(fakeReq);
    const resBody = await res.text();

    return new Response(resBody || JSON.stringify({ proxied: true, status: res.status }), {
      status: res.status,
      headers: res.headers,
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
