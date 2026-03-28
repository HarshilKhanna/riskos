'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { SignInButton, SignOutButton, SignUpButton, Show } from '@clerk/nextjs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getMarketStatus } from '@/lib/mockData';
import { containerVariants } from '@/lib/animations';
import { RiskOSLogoMark } from '@/components/branding/RiskOSLogoMark';

type MarketStatus = ReturnType<typeof getMarketStatus> & {
  regime: string;
  updatedAt: string;
};

const DEMO = {
  var99: 952_339,
  sharpe: 1.12,
  dailyPnLPercent: 2.4,
  varChangePct: 15.2,
};

function formatINR(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export default function LandingPage() {
  const [marketStatus, setMarketStatus] = useState<MarketStatus>({
    isOpen: true,
    status: 'NSE/BSE Open · Closes 3:30 PM IST',
    nextEvent: 'NSE/BSE Open · Closes 3:30 PM IST',
    regime: 'Risk-on',
    updatedAt: 'Updated just now',
  });

  useEffect(() => {
    const raw = getMarketStatus();
    setMarketStatus({
      ...raw,
      regime: raw.isOpen ? 'Risk-on' : 'Risk-off',
      updatedAt: 'Updated just now',
    });
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header className="absolute left-0 right-0 top-0 z-20 px-6 py-5 md:px-10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
          <Link href="/" className="flex items-center gap-2 text-foreground md:justify-self-start">
            <RiskOSLogoMark size={32} />
            <span className="hidden text-lg font-bold sm:inline">RiskOS</span>
          </Link>
          <div className="hidden md:block" aria-hidden />
          <div className="flex items-center justify-end gap-3 md:justify-self-end">
          <Link
            href="/dashboard"
            className="rounded-full border border-cyan-500/40 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/10"
          >
            Go to Dashboard
          </Link>
          <Show when="signed-out">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  <User className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <SignInButton>
                    <button type="button" className="w-full text-left text-sm">
                      Sign in
                    </button>
                  </SignInButton>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <SignUpButton>
                    <button type="button" className="w-full text-left text-sm">
                      Sign up
                    </button>
                  </SignUpButton>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Show>
          <Show when="signed-in">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  <User className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-default">Signed in</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <SignOutButton>
                    <button type="button" className="w-full text-left text-sm">
                      Sign out
                    </button>
                  </SignOutButton>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Show>
          </div>
        </div>
      </header>

      <section className="relative h-[100vh] overflow-hidden border-b border-cyan-900/40 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
        <div className="pointer-events-none absolute inset-0">
          <div className="hero-orbit hero-orbit-primary" />
          <div className="hero-orbit hero-orbit-secondary" />
          <div className="hero-grid" />
        </div>

        <div className="relative mx-auto flex h-full max-w-6xl flex-col gap-8 px-8 pb-20 pt-24 md:flex-row md:items-center md:justify-between md:gap-12 lg:pb-28 lg:pt-28">
          <div className="space-y-6 md:max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200 backdrop-blur">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
              Live portfolio risk cockpit
            </div>

            <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl">
              Manage Risk.
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-cyan-300 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
                Maximize Returns.
              </span>
            </h1>

            <p className="max-w-xl text-sm text-slate-300/80 sm:text-base">
              Monitor exposure, stress-test scenarios, and act on real-time alerts in a single institutional-grade
              workspace. Built for PMs, risk teams, and systematic traders.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.5)] transition hover:bg-cyan-400 hover:shadow-[0_0_35px_rgba(34,211,238,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Go to Dashboard
              </Link>
              <span className="text-xs text-slate-400 md:text-sm">
                See live P&amp;L, VaR, and risk alerts in one view.
              </span>
            </div>
          </div>

          <motion.div className="flex-1" variants={containerVariants} initial="hidden" animate="visible">
            <div className="relative mx-auto max-w-md rounded-3xl border border-cyan-500/20 bg-slate-900/60 p-4 shadow-2xl backdrop-blur">
              <div className="mb-3 flex items-center justify-between text-[10px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Risk regime: <span className="font-semibold text-slate-100">{marketStatus.regime}</span>
                </span>
                <span className="font-mono text-xs text-cyan-300/80">{marketStatus.updatedAt}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-[11px]">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <div className="text-[10px] text-emerald-300/80">Portfolio VaR (99%)</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-semibold text-emerald-200">{formatINR(DEMO.var99)}</span>
                    <span className="text-[10px] text-emerald-200/70">INR</span>
                  </div>
                  <div className="mt-1 text-[10px] text-emerald-200/70">
                    vs 30d: ▲{Math.abs(DEMO.varChangePct).toFixed(1)}%
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3">
                  <div className="text-[10px] text-cyan-200/80">Realized P&amp;L (MTD)</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-semibold text-cyan-100">
                      {DEMO.dailyPnLPercent >= 0 ? '+' : ''}
                      {DEMO.dailyPnLPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-cyan-100/70">Sharpe: {DEMO.sharpe.toFixed(2)}</div>
                </div>

                <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-3">
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] text-fuchsia-200/80">Alert level</div>
                    <span className="relative inline-flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                    </span>
                  </div>
                  <div className="mt-1 text-lg font-semibold text-fuchsia-100">critical</div>
                  <div className="mt-1 text-[10px] text-fuchsia-100/70">5 open signals</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <style>{`
        .hero-orbit {
          position: absolute;
          border-radius: 9999px;
          filter: blur(40px);
          opacity: 0.55;
          mix-blend-mode: screen;
          will-change: transform, opacity;
        }

        .hero-orbit-primary {
          width: 520px;
          height: 520px;
          top: -120px;
          left: -80px;
          background: radial-gradient(circle at 30% 20%, rgba(6, 182, 212, 0.8), transparent 60%);
          animation: heroFloat 18s ease-in-out infinite alternate;
        }

        .hero-orbit-secondary {
          width: 420px;
          height: 420px;
          bottom: -120px;
          right: -40px;
          background: radial-gradient(circle at 100% 100%, rgba(244, 114, 182, 0.8), transparent 60%);
          animation: heroFloat 22s ease-in-out infinite alternate-reverse;
        }

        .hero-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right, rgba(15, 23, 42, 0.8) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15, 23, 42, 0.8) 1px, transparent 1px);
          background-size: 56px 56px;
          opacity: 0.3;
          mask-image: radial-gradient(circle at center, black 0, transparent 70%);
        }

        @keyframes heroFloat {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.5;
          }
          50% {
            transform: translate3d(10px, -16px, 0) scale(1.05);
            opacity: 0.7;
          }
          100% {
            transform: translate3d(-6px, 10px, 0) scale(1.02);
            opacity: 0.55;
          }
        }
      `}</style>
    </div>
  );
}
