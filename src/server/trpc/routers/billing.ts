import { router, protectedProcedure } from '../init';
import { z } from 'zod';
import { getStripe, PLAN_LIMITS } from '@/lib/stripe';
import { appProfiles } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export const billingRouter = router({
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const tier = ctx.profile.tier;
    const limit = PLAN_LIMITS[tier] ?? 1;
    return {
      tier,
      episodesUsed: ctx.profile.episodesUsedThisMonth,
      episodesLimit: limit,
      stripeSubscriptionId: ctx.profile.stripeSubscriptionId,
    };
  }),

  createCheckout: protectedProcedure
    .input(z.object({ plan: z.enum(['creator', 'pro']) }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();

      const priceId =
        input.plan === 'creator'
          ? process.env.STRIPE_CREATOR_PRICE_ID
          : process.env.STRIPE_PRO_PRICE_ID;

      if (!priceId) throw new Error('Price ID not configured');

      let customerId = ctx.profile.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: ctx.user.email,
          name: ctx.user.name,
          metadata: { profileId: ctx.profile.id, authUserId: ctx.user.id },
        });
        customerId = customer.id;
        await ctx.db
          .update(appProfiles)
          .set({ stripeCustomerId: customerId, updatedAt: new Date() })
          .where(eq(appProfiles.id, ctx.profile.id));
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://animelearn.vercel.app'}/dashboard/settings?success=1`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://animelearn.vercel.app'}/dashboard/settings`,
        metadata: { profileId: ctx.profile.id },
      });

      return { url: session.url };
    }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.profile.stripeCustomerId) {
      throw new Error('No billing account found');
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: ctx.profile.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://animelearn.vercel.app'}/dashboard/settings`,
    });

    return { url: session.url };
  }),
});
