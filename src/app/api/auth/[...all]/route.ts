import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

const handler = toNextJsHandler(auth);

export const GET = async (req: Request) => {
  try {
    return await handler.GET(req);
  } catch (e) {
    console.error('[auth GET error]', e);
    return Response.json(
      { error: 'GET handler threw', message: String(e), stack: (e as Error).stack },
      { status: 500 },
    );
  }
};

export const POST = async (req: Request) => {
  try {
    const url = new URL(req.url);
    console.log('[auth POST]', url.pathname);

    const res = await handler.POST(req);

    if (res.status >= 400) {
      const body = await res.clone().text();
      console.error('[auth POST response error]', res.status, body || '(empty body)');
    }

    return res;
  } catch (e) {
    console.error('[auth POST threw]', e);
    return Response.json(
      { error: 'POST handler threw', message: String(e), stack: (e as Error).stack },
      { status: 500 },
    );
  }
};
