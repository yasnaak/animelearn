import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/server/db';
import { appProfiles } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export async function createTRPCContext() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  let profile = null;
  if (session?.user) {
    const result = await db
      .select()
      .from(appProfiles)
      .where(eq(appProfiles.authUserId, session.user.id))
      .limit(1);
    profile = result[0] ?? null;

    // Auto-create profile on first access
    if (!profile) {
      const inserted = await db
        .insert(appProfiles)
        .values({ authUserId: session.user.id })
        .returning();
      profile = inserted[0];
    }
  }

  return {
    session,
    user: session?.user ?? null,
    profile,
    db,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
