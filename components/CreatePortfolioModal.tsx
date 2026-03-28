'use client'

import { useEffect, useState } from 'react'
import { Loader2, PlusCircle } from 'lucide-react'

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Portfolio } from '@/hooks/usePortfolios'

export function CreatePortfolioModal({
  open,
  onOpenChange,
  onCreate,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => Promise<Portfolio>
  onCreated?: (portfolio: Portfolio) => void
}) {
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setName('')
      setIsSaving(false)
    }
  }, [open])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || isSaving) return

    setIsSaving(true)
    try {
      const created = await onCreate(trimmed)
      onCreated?.(created)
      onOpenChange(false)
      setName('')
    } catch (err) {
      // Keep modal open; dashboard will surface errors if needed elsewhere.
      // eslint-disable-next-line no-console
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-primary/20 bg-background">
        <DialogHeader>
          <DialogTitle>Create portfolio</DialogTitle>
          <DialogDescription>Give it a name so you can manage risk across portfolios.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Growth Strategy"
            className="w-full px-3 py-2 bg-muted border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/60"
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <DialogClose asChild>
              <button
                type="button"
                className="px-4 py-2 rounded-md border border-[#00bcd4]/40 text-[#00bcd4] bg-transparent font-semibold text-sm hover:bg-[#00bcd4]/15 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
            </DialogClose>

            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#00bcd4] text-slate-950 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isSaving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EmptyPortfolioState({
  onCreate,
  onCreated,
}: {
  onCreate: (name: string) => Promise<Portfolio>
  onCreated?: (portfolio: Portfolio) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="glassmorphic p-6 rounded-lg border flex flex-col items-center justify-center text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-[#00bcd4]/10 border border-[#00bcd4]/30 flex items-center justify-center">
        <PlusCircle className="w-6 h-6 text-[#00bcd4]" />
      </div>

      <h3 className="text-foreground font-semibold text-lg">No portfolios yet</h3>
      <p className="text-muted-foreground text-sm max-w-sm">
        Create your first portfolio to start tracking risk metrics.
      </p>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 px-4 py-2 rounded-md bg-[#00bcd4] text-slate-950 font-semibold text-sm hover:opacity-90 transition-opacity"
      >
        Create Portfolio
      </button>

      <CreatePortfolioModal
        open={open}
        onOpenChange={setOpen}
        onCreate={onCreate}
        onCreated={onCreated}
      />
    </div>
  )
}

