'use client';

import { motion } from 'framer-motion';
import { Bell, User } from 'lucide-react';
import { itemVariants } from '@/lib/animations';
import { SignInButton, SignOutButton, SignUpButton, Show } from '@clerk/nextjs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavbarProps {
  marketStatus: { isOpen: boolean; status: string; nextEvent: string };
  unreadAlertsCount?: number;
  isLive?: boolean;
}

export function Navbar({
  marketStatus,
  unreadAlertsCount = 0,
  isLive = false,
}: NavbarProps) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="glassmorphic border-b border-primary/20 px-8 py-4 sticky top-0 z-50"
    >
      <div className="flex items-center justify-between gap-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="flex items-center gap-3 group cursor-pointer"
        >
          <div className="relative w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center font-bold text-background group-hover:glow-primary transition-all">
            R
          </div>
          <span className="font-bold text-xl text-foreground hidden sm:inline">
            RiskOS
          </span>
        </motion.div>

        {/* Center: Breadcrumb Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="hidden md:flex items-center gap-2 text-sm text-muted-foreground"
        >
          <span>Dashboard</span>
          <span className="text-primary/40">/</span>
          <span className="text-primary">Portfolio Analysis</span>
        </motion.div>

        {/* Right: Controls */}
        <div className="flex items-center gap-6">
          <motion.div
            variants={itemVariants}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted"
          >
            <motion.span
              animate={isLive ? { scale: [1, 1.25, 1], opacity: [1, 0.65, 1] } : undefined}
              transition={isLive ? { duration: 1.6, repeat: Infinity } : undefined}
              className={`inline-flex w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-amber-400'}`}
            />
            <span className={`text-xs font-medium ${isLive ? 'text-emerald-300' : 'text-amber-300'}`}>
              {isLive ? 'Live' : 'Delayed'}
            </span>
          </motion.div>

          {/* Market Status */}
          <motion.div
            variants={itemVariants}
            className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-lg bg-muted"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`w-2 h-2 rounded-full ${marketStatus.isOpen ? 'bg-secondary' : 'bg-destructive'}`}
            />
            <div className="flex flex-col gap-0">
              <span className="text-xs font-mono text-foreground">
                {marketStatus.status}
              </span>
              <span className="text-xs text-muted-foreground">
                {marketStatus.nextEvent}
              </span>
            </div>
          </motion.div>

          {/* Notification Bell */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            {unreadAlertsCount > 0 ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-[10px] leading-4 text-white text-center font-semibold"
              >
                {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
              </motion.span>
            ) : null}
          </motion.button>

          {/* Profile / Auth */}
          <Show when="signed-out">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  type="button"
                >
                  <User className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <SignInButton>
                    <button
                      type="button"
                      className="w-full text-left text-sm text-foreground"
                    >
                      Sign in
                    </button>
                  </SignInButton>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <SignUpButton>
                    <button
                      type="button"
                      className="w-full text-left text-sm text-foreground"
                    >
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
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  type="button"
                >
                  <User className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <button
                    type="button"
                    className="w-full text-left text-sm text-foreground cursor-default"
                    onClick={(e) => e.preventDefault()}
                  >
                    Signed in
                  </button>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <SignOutButton>
                    <button
                      type="button"
                      className="w-full text-left text-sm text-foreground"
                    >
                      Sign out
                    </button>
                  </SignOutButton>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Show>
        </div>
      </div>
    </motion.nav>
  );
}
