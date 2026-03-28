"use client";

import Link from 'next/link';
import { ArrowRight, BadgeCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const HIGHLIGHTS = [
  {
    title: 'No listing fees',
    description: 'Launch your storefront and start listing without upfront fees.',
  },
  {
    title: 'Verified badge',
    description: 'Earn a trust badge after a quick review of your application.',
  },
  {
    title: 'Direct payouts',
    description: 'Receive earnings directly in your bank account.',
  },
] as const;

export default function SellerLanding() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,200,87,0.18),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(125,92,255,0.14),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,246,241,1))]" />
      <div className="relative container max-w-5xl py-20 md:py-28">
        <div className="flex flex-col gap-14 md:gap-16">
          <section className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
              <Badge variant="outline" className="w-fit gap-2 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" />
              For makers and brands
            </Badge>
            <div className="space-y-4">
              <h1 className="text-4xl font-heading leading-tight tracking-tight md:text-6xl">
                Build your storefront on YourFavMaker
              </h1>
              <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
                Set up a branded storefront, present your products beautifully, and reach buyers who value craft and authenticity.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href="/seller/register">
                  Apply now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/seller/plans">View plans</Link>
              </Button>
            </div>
          </section>

          <section className="mx-auto grid w-full max-w-2xl gap-4 text-left sm:grid-cols-3 md:gap-5">
            {HIGHLIGHTS.map(item => (
              <div key={item.title} className="flex min-h-32 flex-col items-start gap-3 rounded-2xl border bg-background/80 p-4 shadow-sm">
                <BadgeCheck className="h-4 w-4 text-success flex-shrink-0" />
                <div className="space-y-1">
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                  <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
