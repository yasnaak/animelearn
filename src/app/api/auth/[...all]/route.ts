import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export const POST = async (req: Request) => {
  const url = new URL(req.url);
  console.log('[auth POST]', url.pathname, {
    origin: req.headers.get('origin'),
    referer: req.headers.get('referer'),
    host: req.headers.get('host'),
  });

  const res = await handler.POST(req);

  if (res.status >= 400) {
    const body = await res.clone().text();
    console.error('[auth POST error]', res.status, body || '(empty body)');
    // Return the body for debugging if empty
    if (!body) {
      return new Response(
        JSON.stringify({
          error: 'Auth returned empty error',
          status: res.status,
          path: url.pathname,
        }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  return res;
};
