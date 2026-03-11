import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { db } from '@/server/db';
import { appProfiles } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.subscription && session.metadata?.profileId) {
        const subscription = await getStripe().subscriptions.retrieve(
          session.subscription as string,
        );
        const tier = tierFromPriceId(subscription.items.data[0]?.price.id);
        await db
          .update(appProfiles)
          .set({
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            tier,
            updatedAt: new Date(),
          })
          .where(eq(appProfiles.id, session.metadata.profileId));
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const tier = tierFromPriceId(subscription.items.data[0]?.price.id);
      const status = subscription.status;
      if (status === 'active' || status === 'trialing') {
        await db
          .update(appProfiles)
          .set({ tier, updatedAt: new Date() })
          .where(eq(appProfiles.stripeSubscriptionId, subscription.id));
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await db
        .update(appProfiles)
        .set({
          tier: 'free',
          stripeSubscriptionId: null,
          updatedAt: new Date(),
        })
        .where(eq(appProfiles.stripeSubscriptionId, subscription.id));
      break;
    }
  }

  return NextResponse.json({ received: true });
}

function tierFromPriceId(priceId: string | undefined): 'free' | 'creator' | 'pro' {
  if (priceId === process.env.STRIPE_CREATOR_PRICE_ID) return 'creator';
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';
  return 'free';
}
