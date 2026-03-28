'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import {
  connectSocket,
  disconnectSocket,
} from '@/lib/market/finnhubSocket'

export function FinnhubSocketBootstrap() {
  const { isLoaded, user } = useUser()

  useEffect(() => {
    if (!isLoaded || !user) return
    connectSocket()
    return () => {
      disconnectSocket()
    }
  }, [isLoaded, user?.id])

  return null
}

