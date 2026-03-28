"use client";

import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight, BadgeCheck, Check, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PLANS = [
  { name: 'Free', price: '₹0', period: 'forever', note: 'For getting started', features: ['10 total products', 'Basic analytics', 'Standard support'] },
  { name: 'Starter', price: '₹699', period: 'month', note: 'For early growth', features: ['Higher product limits', 'Sales reports', 'Email support'] },
  { name: 'Growth', price: '₹1,999', period: 'month', note: 'For active sellers', features: ['Advanced analytics', 'Bulk tools', 'Priority support'] },
] as const;

export default function SellerPlans() {
  return (
    <div className="container max-w-6xl py-20 md:py-28 animate-fade-in">
      <div className="max-w-2xl mx-auto text-center space-y-5 mb-14">
        <Badge variant="outline" className="w-fit mx-auto gap-2 px-3 py-1">
          <Store className="h-3.5 w-3.5" />
          Seller plans
        </Badge>
        <h1 className="text-4xl md:text-6xl font-heading tracking-tight leading-tight">
          Simple plans that grow with your store.
        </h1>
        <p className="text-base md:text-lg text-muted-foreground">
          Start with a lightweight free plan, then move up when you need more products, sharper insights, and faster support.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button asChild size="lg" className="gap-2">
            <Link href={'/seller/register' as Route}>
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={'/seller' as Route}>Back to seller page</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan, index) => (
          <div
            key={plan.name}
            className={`rounded-2xl border bg-card p-5 ${index === 1 ? 'ring-1 ring-accent/20 border-accent/40' : ''}`}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{plan.note}</p>
                <h2 className="text-2xl font-heading">{plan.name}</h2>
              </div>
              {index === 1 && <Badge className="bg-accent text-accent-foreground">Popular</Badge>}
            </div>
            <p className="text-3xl font-heading mb-1">{plan.price}</p>
            <p className="text-xs text-muted-foreground mb-4">/{plan.period}</p>
            <ul className="space-y-2">
              {plan.features.map(feature => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <BadgeCheck className="h-4 w-4 text-success" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Button asChild variant="outline">
          <Link href={'/seller/register' as Route}>Start application</Link>
        </Button>
      </div>
    </div>
  );
}
