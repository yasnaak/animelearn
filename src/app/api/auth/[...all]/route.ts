export const GET = async (req: Request) => {
  try {
    const { auth } = await import('@/lib/auth');
    return await auth.handler(req);
  } catch (e) {
    return Response.json({ error: 'GET threw', message: String(e) }, { status: 500 });
  }
};

export const POST = async (req: Request) => {
  try {
    const { auth } = await import('@/lib/auth');

    // Reconstruct clean request — Vercel headers may confuse Better Auth
    const url = new URL(req.url);
    const body = await req.text();
    const cleanReq = new Request(url.toString(), {
      method: 'POST',
      headers: {
        'content-type': req.headers.get('content-type') || 'application/json',
        'origin': req.headers.get('origin') || url.origin,
      },
      body,
    });

    const res = await auth.handler(cleanReq);

    // Debug: if still failing, return info
    if (res.status >= 400) {
      const resBody = await res.clone().text();
      if (!resBody) {
        return Response.json({
          debug: true,
          cleanUrl: url.toString(),
          responseStatus: res.status,
          responseBody: '(empty)',
        }, { status: res.status });
      }
    }

    return res;
  } catch (e) {
    return Response.json(
      { error: 'POST threw', message: String(e), stack: (e as Error).stack },
      { status: 500 },
    );
  }
};
