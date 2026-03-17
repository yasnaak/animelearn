export const GET = async (req: Request) => {
  try {
    const { auth } = await import('@/lib/auth');
    return await auth.handler(req);
  } catch (e) {
    console.error('[auth GET error]', e);
    return Response.json(
      { error: 'GET threw', message: String(e) },
      { status: 500 },
    );
  }
};

export const POST = async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // Debug: return request info before doing anything else
  if (url.searchParams.has('echo')) {
    return Response.json({ echo: true, path, method: 'POST' });
  }

  try {
    const { auth } = await import('@/lib/auth');
    return await auth.handler(req);
  } catch (e) {
    console.error('[auth POST error]', e);
    return Response.json(
      { error: 'POST threw', message: String(e), stack: (e as Error).stack },
      { status: 500 },
    );
  }
};
