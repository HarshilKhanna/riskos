import { auth } from '@clerk/nextjs/server'
import { fetchPriceHistory } from '@/lib/market/prices'

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ message: 'Unauthorized' }, { status: 403 })

  const url = new URL(req.url)
  const symbol = (url.searchParams.get('symbol') ?? '').trim().toUpperCase()
  const daysRaw = url.searchParams.get('days')
  const days = daysRaw ? Math.max(30, Number(daysRaw)) : 252

  if (!symbol) {
    return Response.json(
      { message: '`symbol` query param is required.' },
      { status: 400 }
    )
  }

  const prices = await fetchPriceHistory(symbol, days)
  return Response.json(prices, { status: 200 })
}

