'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'

export function ClerkUserSync() {
  const { user, isLoaded } = useUser()
  const lastSyncedUserRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !user) return
    if (lastSyncedUserRef.current === user.id) return

    lastSyncedUserRef.current = user.id
    void fetch('/api/auth/sync', { method: 'POST' }).catch(console.error)
  }, [isLoaded, user])

  return null
}

