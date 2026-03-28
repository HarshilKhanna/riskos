'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'

const FINNHUB_WS_BASE = 'wss://ws.finnhub.io'
const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECT_ATTEMPTS = 5

const SUBSCRIPTIONS = ['BINANCE:BTCINR', 'OANDA:USD_INR'] as const

const FINNHUB_TO_RISKOS_SYMBOL: Record<string, string> = {
  'BINANCE:BTCINR': 'BTCINR',
  'OANDA:USD_INR': 'USDINR',
}

let socket: WebSocket | null = null
let reconnectAttempts = 0
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let manuallyClosed = false

let priceUpdatesChannel:
  | ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']>
  | null = null
let realtimeSupabase: ReturnType<typeof getSupabaseBrowserClient> | null = null

function cleanupReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

async function ensureRealtimeChannel() {
  if (!realtimeSupabase) {
    realtimeSupabase = getSupabaseBrowserClient()
  }
  if (!priceUpdatesChannel) {
    priceUpdatesChannel = realtimeSupabase
      .channel('price_updates')
      .subscribe()
  }
}

async function broadcastPriceUpdate(symbol: string, price: number, timestamp: string) {
  try {
    await ensureRealtimeChannel()
    if (!priceUpdatesChannel) return

    await priceUpdatesChannel.send({
      type: 'broadcast',
      event: 'price_update',
      payload: { symbol, price, timestamp },
    })
  } catch {
    // no-op; live pricing should not break the UI
  }
}

async function persistTick(symbol: string, price: number, timestamp: string) {
  const supabase = getSupabaseBrowserClient()

  await supabase
    .from('assets')
    .update({
      current_price: price,
      last_price_update: timestamp,
    })
    .eq('symbol', symbol)

  await supabase.from('price_history').insert({
    symbol,
    price,
    recorded_at: timestamp,
  })
}

async function handleTick(rawSymbol: string, price: unknown, tickTs: unknown) {
  const symbol = FINNHUB_TO_RISKOS_SYMBOL[rawSymbol]
  const numericPrice = Number(price)
  if (!symbol || !Number.isFinite(numericPrice) || numericPrice <= 0) return

  const timestamp =
    typeof tickTs === 'number' && Number.isFinite(tickTs)
      ? new Date(tickTs).toISOString()
      : new Date().toISOString()

  await persistTick(symbol, numericPrice, timestamp)
  await broadcastPriceUpdate(symbol, numericPrice, timestamp)
}

function scheduleReconnect() {
  if (manuallyClosed) return
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return
  reconnectAttempts += 1
  cleanupReconnectTimer()
  reconnectTimer = setTimeout(() => {
    connectSocket()
  }, RECONNECT_DELAY_MS)
}

export function connectSocket(): void {
  const token = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? process.env.FINNHUB_API_KEY
  if (!token) {
    // eslint-disable-next-line no-console
    console.warn('Finnhub socket not started: missing NEXT_PUBLIC_FINNHUB_API_KEY')
    return
  }

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return
  }

  manuallyClosed = false
  cleanupReconnectTimer()

  const wsUrl = `${FINNHUB_WS_BASE}?token=${token}`
  socket = new WebSocket(wsUrl)

  socket.onopen = () => {
    reconnectAttempts = 0
    for (const symbol of SUBSCRIPTIONS) {
      socket?.send(JSON.stringify({ type: 'subscribe', symbol }))
    }
  }

  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(String(event.data)) as {
        type?: string
        data?: Array<{ s?: string; p?: number; t?: number }>
      }
      if (!parsed || parsed.type !== 'trade' || !Array.isArray(parsed.data)) return

      for (const tick of parsed.data) {
        if (!tick?.s) continue
        void handleTick(tick.s, tick.p, tick.t)
      }
    } catch {
      // ignore malformed messages
    }
  }

  socket.onerror = () => {
    scheduleReconnect()
  }

  socket.onclose = () => {
    socket = null
    scheduleReconnect()
  }
}

export function disconnectSocket(): void {
  manuallyClosed = true
  cleanupReconnectTimer()

  if (socket) {
    socket.close()
    socket = null
  }

  if (priceUpdatesChannel && realtimeSupabase) {
    void realtimeSupabase.removeChannel(priceUpdatesChannel)
    priceUpdatesChannel = null
  }
}

export function isConnected(): boolean {
  return socket?.readyState === WebSocket.OPEN
}

