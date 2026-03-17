export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Step 1: verify handler executes
  const steps: string[] = ['start'];

  try {
    // Step 2: read body
    const body = await req.text();
    steps.push(`body_read(${body.length}chars)`);

    // Step 3: import auth
    const { auth } = await import('@/lib/auth');
    steps.push('auth_imported');

    // Step 4: create request
    const fakeReq = new Request(
      'https://animelearn.vercel.app/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      },
    );
    steps.push('request_created');

    // Step 5: call handler
    const res = await auth.handler(fakeReq);
    steps.push(`handler_returned(${res.status})`);

    // Step 6: read response
    const resBody = await res.text();
    steps.push(`body_read(${resBody.length}chars)`);

    return Response.json({
      steps,
      status: res.status,
      body: resBody.substring(0, 500) || '(empty)',
      headers: Object.fromEntries(res.headers.entries()),
    });
  } catch (e) {
    steps.push(`error: ${String(e)}`);
    return Response.json({ steps, error: String(e) }, { status: 500 });
  }
}
