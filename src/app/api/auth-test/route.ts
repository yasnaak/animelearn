export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') || 'api';

  try {
    const body = await req.json();
    const { auth } = await import('@/lib/auth');

    if (mode === 'api') {
      // Test: call auth.api directly (no HTTP handler)
      const result = await auth.api.signInEmail({
        body: { email: body.email, password: body.password },
      });
      return Response.json({ mode: 'api', result });
    }

    if (mode === 'handler') {
      // Test: call auth.handler with fake request
      const fakeReq = new Request(
        'https://animelearn.vercel.app/api/auth/sign-in/email',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const res = await auth.handler(fakeReq);
      const resBody = await res.text();
      return Response.json({
        mode: 'handler',
        status: res.status,
        body: resBody.substring(0, 500) || '(empty)',
        headers: Object.fromEntries(res.headers.entries()),
      });
    }

    return Response.json({ error: 'Use ?mode=api or ?mode=handler' });
  } catch (e) {
    return Response.json(
      { error: String(e), stack: (e as Error).stack?.substring(0, 300) },
      { status: 500 },
    );
  }
}
