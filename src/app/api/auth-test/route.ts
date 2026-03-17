export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const { auth } = await import('@/lib/auth');

    const fakeReq = new Request(
      'https://animelearn.vercel.app/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      },
    );

    const res = await auth.handler(fakeReq);
    const resBody = await res.text();

    return new Response(resBody, {
      status: res.status,
      headers: res.headers,
    });
  } catch (e) {
    return Response.json(
      { error: String(e), stack: (e as Error).stack },
      { status: 500 },
    );
  }
}
