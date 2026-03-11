'use client';

import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Zap, Crown, Check } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const TIER_INFO: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  free: { label: 'Free', icon: Zap, color: 'text-zinc-400' },
  creator: { label: 'Creator', icon: Zap, color: 'text-cyan-400' },
  pro: { label: 'Pro', icon: Crown, color: 'text-fuchsia-400' },
};

function SettingsContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');

  const { data, isLoading } = trpc.billing.getSubscription.useQuery();
  const checkout = trpc.billing.createCheckout.useMutation();
  const portal = trpc.billing.createPortalSession.useMutation();

  const handleCheckout = async (plan: 'creator' | 'pro') => {
    const result = await checkout.mutateAsync({ plan });
    if (result.url) window.location.href = result.url;
  };

  const handleManage = async () => {
    const result = await portal.mutateAsync();
    if (result.url) window.location.href = result.url;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tier = data?.tier ?? 'free';
  const info = TIER_INFO[tier] ?? TIER_INFO.free;
  const Icon = info.icon;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account and subscription
        </p>
      </div>

      {success && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-400">
          Subscription activated successfully.
        </div>
      )}

      {/* Current plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${info.color}`} />
            Current Plan
          </CardTitle>
          <CardDescription>
            Your subscription and usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="outline" className="text-sm">
                {info.label}
              </Badge>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              {data?.episodesUsed ?? 0} / {data?.episodesLimit === 999999 ? 'Unlimited' : data?.episodesLimit} episodes this month
            </div>
          </div>

          {/* Usage bar */}
          {data && data.episodesLimit !== 999999 && (
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all"
                style={{
                  width: `${Math.min(100, (data.episodesUsed / data.episodesLimit) * 100)}%`,
                }}
              />
            </div>
          )}

          {data?.stripeSubscriptionId ? (
            <Button
              onClick={handleManage}
              variant="outline"
              disabled={portal.isPending}
            >
              {portal.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Manage Subscription
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* Upgrade options */}
      {tier !== 'pro' && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade</CardTitle>
            <CardDescription>Get more episodes and features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {tier !== 'creator' && (
                <div className="rounded-lg border border-zinc-800 p-4 space-y-3">
                  <div className="font-semibold">Creator</div>
                  <div className="text-2xl font-bold">&euro;29<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-400" /> 5 episodes/month</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-400" /> 1080p output</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-400" /> Priority rendering</li>
                  </ul>
                  <Button
                    onClick={() => handleCheckout('creator')}
                    disabled={checkout.isPending}
                    className="w-full"
                  >
                    {checkout.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Upgrade to Creator
                  </Button>
                </div>
              )}
              <div className="rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 space-y-3">
                <div className="font-semibold">Pro</div>
                <div className="text-2xl font-bold">&euro;89<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-fuchsia-400" /> Unlimited episodes</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-fuchsia-400" /> 4K output</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-fuchsia-400" /> Priority support</li>
                </ul>
                <Button
                  onClick={() => handleCheckout('pro')}
                  disabled={checkout.isPending}
                  className="w-full bg-gradient-to-r from-fuchsia-500 to-cyan-500"
                >
                  {checkout.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Upgrade to Pro
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}
