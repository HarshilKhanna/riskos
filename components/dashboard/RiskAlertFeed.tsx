'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { itemVariants, alertSlideVariants } from '@/lib/animations';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type AlertFeedItem = {
  alert_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  triggered_at: string;
  acknowledged: boolean;
  user_id?: string;
  portfolio_name?: string | null;
};

type RiskAlertFeedProps = {
  onUnreadCountChange?: (count: number) => void;
  refreshToken?: number;
  /** When set, only show alerts of this severity (active list). */
  severityFilter?: 'all' | 'critical' | 'warning' | 'info';
  /** Compact card chrome for embedded panels */
  variant?: 'default' | 'embedded';
};

const SEVERITY_ORDER: Array<'critical' | 'warning' | 'info'> = ['critical', 'warning', 'info'];

function byNewestFirst(a: AlertFeedItem, b: AlertFeedItem) {
  return new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime();
}

function groupAlertsBySeverity(alerts: AlertFeedItem[]) {
  const critical = alerts.filter((x) => x.severity === 'critical').sort(byNewestFirst);
  const warning = alerts.filter((x) => x.severity === 'warning').sort(byNewestFirst);
  const info = alerts.filter((x) => x.severity === 'info').sort(byNewestFirst);
  return { critical, warning, info };
}

function getSeverityBorderStyles(severity: string) {
  switch (severity) {
    case 'critical':
      return 'border-l-4 border-l-red-500 border-y border-r border-y-white/[0.06] border-r-white/[0.06] bg-destructive/5';
    case 'warning':
      return 'border-l-4 border-l-amber-500 border-y border-r border-y-white/[0.06] border-r-white/[0.06] bg-amber-500/5';
    case 'info':
      return 'border-l-4 border-l-cyan-500 border-y border-r border-y-white/[0.06] border-r-white/[0.06] bg-cyan-500/5';
    default:
      return 'border border-muted';
  }
}

export function RiskAlertFeed({
  onUnreadCountChange,
  refreshToken,
  severityFilter = 'all',
  variant = 'default',
}: RiskAlertFeedProps) {
  const { userId } = useAuth();
  const [activeAlerts, setActiveAlerts] = useState<AlertFeedItem[]>([]);
  const [historyAlerts, setHistoryAlerts] = useState<AlertFeedItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [ackPending, setAckPending] = useState<string | null>(null);
  /** Brief grey “✓ Acknowledged” row after removal from active list. */
  const [displayAck, setDisplayAck] = useState<AlertFeedItem | null>(null);
  /** IDs from Realtime INSERT — use slide-in enter animation only for these. */
  const [realtimeIds, setRealtimeIds] = useState<Set<string>>(() => new Set());

  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      if (!res.ok) return;
      const data = (await res.json()) as {
        active?: AlertFeedItem[];
        history?: AlertFeedItem[];
      };
      const active = (data.active ?? []).filter((a) => !a.acknowledged);
      const history = data.history ?? [];
      setActiveAlerts(active);
      setHistoryAlerts(history);
      onUnreadCountChange?.(active.length);
    } catch {
      // ignore
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    if (refreshToken === undefined) return;
    void loadAlerts();
  }, [refreshToken, loadAlerts]);

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null = null;
    let realtimeSupabase: ReturnType<typeof getSupabaseBrowserClient> | null = null;
    try {
      realtimeSupabase = getSupabaseBrowserClient();
      channel = realtimeSupabase
        .channel('alerts-feed')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'alerts' },
          (payload) => {
            const row = payload.new as AlertFeedItem & { user_id?: string };
            if (!row?.alert_id || row.acknowledged) return;
            if (userId && row.user_id && row.user_id !== userId) return;
            setRealtimeIds((prev) => {
              const next = new Set(prev);
              next.add(row.alert_id);
              return next;
            });
            window.setTimeout(() => {
              setRealtimeIds((prev) => {
                const next = new Set(prev);
                next.delete(row.alert_id);
                return next;
              });
            }, 900);
            setActiveAlerts((prev) => {
              if (prev.some((a) => a.alert_id === row.alert_id)) return prev;
              const next = [row as AlertFeedItem, ...prev];
              onUnreadCountChange?.(next.length);
              return next;
            });
            // Toast handled globally by dashboard alert bell sync
          }
        )
        .subscribe();
    } catch {
      // Missing supabase env
    }
    return () => {
      if (channel && realtimeSupabase) {
        void realtimeSupabase.removeChannel(channel);
      }
    };
  }, [userId, onUnreadCountChange]);

  const grouped = useMemo(() => groupAlertsBySeverity(activeAlerts), [activeAlerts]);

  const orderedActive = useMemo(() => {
    const out: AlertFeedItem[] = [];
    for (const sev of SEVERITY_ORDER) {
      if (severityFilter !== 'all' && sev !== severityFilter) continue;
      out.push(...grouped[sev]);
    }
    return out;
  }, [grouped, severityFilter]);

  const acknowledgeAlert = async (id: string) => {
    setAckPending(id);
    try {
      const res = await fetch(`/api/alerts/${id}/acknowledge`, { method: 'POST' });
      if (!res.ok) throw new Error('ack failed');
      const data = (await res.json()) as { success?: boolean };
      if (!data.success) throw new Error('ack failed');
    } catch {
      setAckPending(null);
      toast.error('Could not acknowledge alert');
      return;
    }

    setAckPending(null);
    const row = activeAlerts.find((a) => a.alert_id === id);
    setActiveAlerts((prev) => {
      const next = prev.filter((a) => a.alert_id !== id);
      onUnreadCountChange?.(next.length);
      return next;
    });
    if (row) {
      setDisplayAck({ ...row, acknowledged: true });
    }
    window.setTimeout(() => {
      setDisplayAck(null);
      if (row) {
        setHistoryAlerts((h) => [{ ...row, acknowledged: true }, ...h.filter((x) => x.alert_id !== id)]);
      }
    }, 550);
  };

  const showListScrollbar = orderedActive.length + (displayAck ? 1 : 0) > 3;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-cyan-400" />;
      default:
        return null;
    }
  };

  const renderAlertCard = (alert: AlertFeedItem, opts: { isAckGhost?: boolean }) => {
    const isAckGhost = opts.isAckGhost ?? false;
    return (
      <motion.div
        key={isAckGhost ? `ack-${alert.alert_id}` : alert.alert_id}
        layout
        variants={alertSlideVariants}
        initial={
          isAckGhost ? false : realtimeIds.has(alert.alert_id) ? 'hidden' : false
        }
        animate="visible"
        exit="exit"
        className={`rounded-lg p-4 backdrop-blur-sm transition-all ${
          isAckGhost
            ? 'border border-muted/60 bg-muted/15 text-muted-foreground'
            : `${getSeverityBorderStyles(alert.severity)} hover:border-primary/80`
        } group`}
      >
        <div className="flex gap-3">
          <div className="flex-shrink-0 pt-0.5">
            {isAckGhost ? (
              <CheckCircle2 className="w-5 h-5 text-muted-foreground/70" />
            ) : (
              getSeverityIcon(alert.severity)
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <h4
              className={`text-sm font-semibold leading-tight ${
                isAckGhost ? 'text-muted-foreground' : 'text-foreground'
              }`}
            >
              {alert.alert_type}
            </h4>
            <p
              className={`text-xs mt-1 leading-relaxed ${
                isAckGhost ? 'text-muted-foreground/80' : 'text-muted-foreground'
              }`}
            >
              {alert.message}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground/60 leading-tight">
                {new Date(alert.triggered_at).toLocaleString('en-IN')}
              </p>
              {isAckGhost ? (
                <span className="flex-shrink-0 h-[28px] flex items-center text-xs text-muted-foreground/80 font-normal select-none">
                  <span className="mr-1">✓</span>
                  Acknowledged
                </span>
              ) : ackPending === alert.alert_id ? (
                <span className="text-xs text-muted-foreground">…</span>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    void acknowledgeAlert(alert.alert_id);
                  }}
                  className="flex-shrink-0 h-[28px] px-3 rounded-full border border-[#00bcd4] text-[#00bcd4] bg-transparent text-xs font-normal transition-colors hover:bg-[rgba(0,188,212,0.15)]"
                >
                  <span className="mr-1">✓</span>
                  Acknowledge
                </motion.button>
              )}
            </div>
          </div>
        </div>
        {!isAckGhost && alert.severity === 'critical' && (
          <motion.div
            className="mt-3 h-1 bg-destructive/30 rounded-full overflow-hidden"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 8, ease: 'linear' }}
          >
            <div className="h-full bg-destructive" />
          </motion.div>
        )}
      </motion.div>
    );
  };

  const hasActiveList = orderedActive.length > 0 || displayAck !== null;
  const subCount =
    severityFilter === 'all' ? activeAlerts.length : orderedActive.length;

  return (
    <motion.div
      variants={itemVariants}
      className={`${
        variant === 'embedded'
          ? 'rounded-xl border border-white/[0.06] bg-[#111827] p-5'
          : 'glassmorphic p-6 col-span-1 md:col-span-2 lg:col-span-1'
      } flex flex-col min-h-[24rem]`}
    >
      <div className="shrink-0 mb-1">
        <h3 className="text-lg font-semibold text-foreground uppercase tracking-wide">Risk Alerts</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {subCount} active alert{subCount === 1 ? '' : 's'}
        </p>
      </div>

      <div
        className={[
          'flex-1 flex flex-col min-h-0 pr-2 pt-2',
          !hasActiveList && !historyOpen ? 'justify-center items-center' : '',
          showListScrollbar ? 'max-h-96 overflow-y-auto custom-scrollbar' : 'overflow-y-visible',
        ].join(' ')}
      >
        {hasActiveList ? (
          <div className="space-y-3 w-full">
            <AnimatePresence mode="popLayout">
              {displayAck && renderAlertCard(displayAck, { isAckGhost: true })}
              {orderedActive.map((alert) => renderAlertCard(alert, { isAckGhost: false }))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-4 w-full">
            <CheckCircle2 className="w-8 h-8 text-secondary mb-2" />
            <p className="text-sm">All alerts acknowledged</p>
            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              className="mt-3 text-xs text-[#00bcd4] hover:underline inline-flex items-center gap-1"
            >
              View alert history
              {historyOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <AnimatePresence>
              {historyOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="w-full mt-4 overflow-hidden text-left border-t border-primary/10 pt-4"
                >
                  {historyAlerts.length === 0 ? (
                    <p className="text-xs text-muted-foreground/80">No history yet.</p>
                  ) : (
                    <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {historyAlerts.map((h) => (
                        <li
                          key={h.alert_id}
                          className="text-xs text-muted-foreground/90 border border-muted/40 rounded-md px-3 py-2 bg-muted/20"
                        >
                          <span className="font-medium text-muted-foreground">{h.alert_type}</span>
                          <span className="text-muted-foreground/70"> — {h.message}</span>
                          <div className="text-[10px] text-muted-foreground/50 mt-1">
                            {new Date(h.triggered_at).toLocaleString('en-IN')}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <style>{scrollbarStyles}</style>
      </div>
    </motion.div>
  );
}

const scrollbarStyles = `
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 188, 212, 0.55) transparent;
  }
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 212, 255, 0.2);
    border-radius: 2px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 212, 255, 0.4);
  }
`;
