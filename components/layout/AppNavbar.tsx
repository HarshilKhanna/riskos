'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, Menu, User } from 'lucide-react';
import { SignInButton, SignOutButton, Show } from '@clerk/nextjs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MobileDrawer, type NavItem } from '@/components/layout/MobileDrawer';
import { RiskOSLogoMark } from '@/components/branding/RiskOSLogoMark';

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Holdings' },
  { href: '/risk', label: 'Risk Analysis' },
  { href: '/simulation', label: 'Simulation' },
  { href: '/performance', label: 'Performance' },
  { href: '/alerts', label: 'Alerts' },
];

type AppNavbarProps = {
  marketStatus: { isOpen: boolean; status: string; nextEvent: string };
  unreadAlertsCount?: number;
  isLive?: boolean;
};

function navLinkActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavbar({
  marketStatus,
  unreadAlertsCount = 0,
  isLive = false,
}: AppNavbarProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0f1a]/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-3 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-4 md:px-8">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2 md:justify-self-start"
          >
            <RiskOSLogoMark size={32} />
            <span className="hidden font-bold text-lg text-foreground sm:inline">RiskOS</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex md:justify-self-center">
            {NAV_ITEMS.map((item) => {
              const active = navLinkActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                    active ? 'text-[#00e5ff]' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                  {active ? (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.85)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-2 md:justify-self-end md:gap-4">
            <div className="hidden items-center gap-2 rounded-lg border border-white/[0.06] bg-[#111827] px-2.5 py-1.5 sm:flex">
              <span
                className={`inline-flex h-2 w-2 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-amber-400'}`}
              />
              <span
                className={`text-xs font-medium ${isLive ? 'text-emerald-300' : 'text-amber-300'}`}
              >
                {isLive ? 'Live' : 'Delayed'}
              </span>
            </div>

            <div className="hidden max-w-[200px] flex-col gap-0 rounded-lg border border-white/[0.06] bg-[#111827] px-3 py-1.5 lg:flex">
              <span className="text-[11px] font-mono leading-tight text-foreground">
                {marketStatus.status}
              </span>
              <span className="text-[10px] text-muted-foreground">{marketStatus.nextEvent}</span>
            </div>

            <Link
              href="/alerts"
              className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
              aria-label="Alerts"
            >
              <Bell className="h-5 w-5" />
              {unreadAlertsCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white">
                  {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                </span>
              ) : null}
            </Link>

            <Show when="signed-out">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
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
                </DropdownMenuContent>
              </DropdownMenu>
            </Show>

            <Show when="signed-in">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
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

            <button
              type="button"
              className="rounded-lg p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground md:hidden"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={NAV_ITEMS}
        pathname={pathname}
      />
    </>
  );
}
