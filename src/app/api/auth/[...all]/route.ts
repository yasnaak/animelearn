import { auth } from '@/lib/auth';

export const GET = async (req: Request) => {
  try {
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
  try {
    return await auth.handler(req);
  } catch (e) {
    console.error('[auth POST error]', e);
    return Response.json(
      { error: 'POST threw', message: String(e) },
      { status: 500 },
    );
  }
};
