'use client';

import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AssetSearchDropdown } from '@/components/dashboard/AssetSearchDropdown';
import { useDashboard } from '@/components/dashboard/dashboard-provider';

export function AddAssetDialog() {
  const {
    selectedPortfolioId,
    addAsset,
    addAssetOpen,
    setAddAssetOpen,
    addSelectedAsset,
    setAddSelectedAsset,
    addCurrentPrice,
    setAddCurrentPrice,
    addQuantity,
    setAddQuantity,
    addPurchasePrice,
    setAddPurchasePrice,
    addPurchaseDate,
    setAddPurchaseDate,
    addBusy,
    setAddBusy,
    addAssetModalKey,
    setAddAssetModalKey,
    addPriceHint,
    setAddPriceHint,
    addPriceChangePct,
    setAddPriceChangePct,
  } = useDashboard();

  return (
    <Dialog
      open={addAssetOpen}
      onOpenChange={(open) => {
        setAddAssetOpen(open);
        if (open) {
          setAddAssetModalKey((k) => k + 1);
          setAddSelectedAsset(null);
          setAddCurrentPrice('');
          setAddQuantity('');
          setAddPurchasePrice('');
          setAddPriceHint('idle');
          setAddPriceChangePct(null);
        }
      }}
    >
      <DialogContent className="border-primary/20 bg-background">
        <DialogHeader>
          <DialogTitle>Add asset to portfolio</DialogTitle>
          <DialogDescription>
            Search for an asset, confirm the current market price, then add quantity and your purchase cost.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!selectedPortfolioId) return;
            if (!addSelectedAsset) {
              toast.error('Select an asset', {
                description: 'Choose a symbol from the search results.',
              });
              return;
            }
            const symbol = addSelectedAsset.symbol.trim().toUpperCase();
            const quantity = Number(addQuantity);
            const purchase_price = Number(addPurchasePrice);
            const confirmed_current_price = Number(addCurrentPrice);
            const purchase_date = addPurchaseDate
              ? new Date(addPurchaseDate).toISOString()
              : new Date().toISOString();

            if (!Number.isFinite(quantity) || quantity <= 0) {
              toast.error('Invalid quantity', {
                description: 'Enter a quantity greater than 0.',
              });
              return;
            }
            if (!Number.isFinite(purchase_price) || purchase_price <= 0) {
              toast.error('Invalid purchase price', {
                description: 'Enter a purchase price greater than 0.',
              });
              return;
            }
            if (!Number.isFinite(confirmed_current_price) || confirmed_current_price <= 0) {
              toast.error('Invalid current price', {
                description: 'Enter a positive current market price.',
              });
              return;
            }
            if (addBusy) return;

            setAddBusy(true);
            try {
              await addAsset(selectedPortfolioId, {
                symbol,
                quantity,
                purchase_price,
                purchase_date,
                confirmed_current_price,
                asset: addSelectedAsset,
              });
              setAddAssetOpen(false);
              setAddSelectedAsset(null);
              setAddCurrentPrice('');
              setAddQuantity('');
              setAddPurchasePrice('');
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to add asset.';
              toast.error('Add asset failed', { description: message });
            } finally {
              setAddBusy(false);
            }
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Symbol
            </label>
            <AssetSearchDropdown
              key={addAssetModalKey}
              onSelect={(asset) => {
                setAddSelectedAsset(asset);
                setAddCurrentPrice(String(asset.fallbackPrice));
              }}
              placeholder="Search symbol or company name…"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="add-current-price"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Current price (market)
            </label>
            <input
              id="add-current-price"
              type="number"
              step="any"
              min={0}
              value={addCurrentPrice}
              onChange={(e) => setAddCurrentPrice(e.target.value)}
              placeholder="Auto-filled from directory"
              className="w-full rounded-lg border border-primary/20 bg-muted px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/60"
            />
            {addPriceHint === 'loading' ? (
              <p className="text-[11px] leading-snug text-muted-foreground">Fetching live price…</p>
            ) : addPriceHint === 'live' ? (
              <p className="text-[11px] leading-snug text-emerald-500/90">
                Live price fetched
                {addPriceChangePct != null
                  ? ` · ${addPriceChangePct >= 0 ? '+' : ''}${addPriceChangePct.toFixed(2)}% (session)`
                  : ''}
              </p>
            ) : addPriceHint === 'reference' || addPriceHint === 'error' ? (
              <p className="text-[11px] leading-snug text-amber-500/90">
                Using reference price — update if needed
              </p>
            ) : (
              <p className="text-[11px] leading-snug text-muted-foreground">
                Price auto-filled — update if you have a more accurate value.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="add-quantity"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Quantity
            </label>
            <input
              id="add-quantity"
              type="number"
              value={addQuantity}
              onChange={(e) => setAddQuantity(e.target.value)}
              placeholder="Quantity"
              className="w-full rounded-lg border border-primary/20 bg-muted px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/60"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="add-purchase-price"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Purchase price (cost basis)
            </label>
            <input
              id="add-purchase-price"
              type="number"
              step="any"
              min={0}
              value={addPurchasePrice}
              onChange={(e) => setAddPurchasePrice(e.target.value)}
              placeholder="Your cost per unit"
              className="w-full rounded-lg border border-primary/20 bg-muted px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/60"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="add-purchase-date"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Purchase date
            </label>
            <input
              id="add-purchase-date"
              type="date"
              value={addPurchaseDate}
              onChange={(e) => setAddPurchaseDate(e.target.value)}
              className="w-full rounded-lg border border-primary/20 bg-muted px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/60"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAddAssetOpen(false)}
              className="rounded-md border border-[#00bcd4]/40 bg-transparent px-4 py-2 text-sm font-semibold text-[#00bcd4] transition-colors hover:bg-[#00bcd4]/15 disabled:opacity-50"
              disabled={addBusy}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addBusy || !addSelectedAsset}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#00bcd4] px-4 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addBusy ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
