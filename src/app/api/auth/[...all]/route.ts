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
    // Clone request to read body for debugging
    const clonedReq = req.clone();
    const bodyText = await clonedReq.text();

    const { auth } = await import('@/lib/auth');
    const res = await auth.handler(req);

    // If error, return debug info
    if (res.status >= 400) {
      const resBody = await res.clone().text();
      return Response.json({
        debug: true,
        requestUrl: req.url,
        requestHeaders: Object.fromEntries(req.headers.entries()),
        requestBody: bodyText.substring(0, 200),
        responseStatus: res.status,
        responseBody: resBody.substring(0, 500) || '(empty)',
        responseHeaders: Object.fromEntries(res.headers.entries()),
      }, { status: res.status });
    }

    return res;
  } catch (e) {
    return Response.json(
      { error: 'POST threw', message: String(e), stack: (e as Error).stack },
      { status: 500 },
    );
  }
};
