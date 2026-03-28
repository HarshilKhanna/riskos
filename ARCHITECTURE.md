## RiskOS Architecture & Implementation Overview

### 1. Tech Stack

- **Framework**: Next.js App Router (`app/`), TypeScript.
- **UI**: React, Tailwind CSS (via `globals.css`), custom glassmorphic + glow utilities.
- **Charts**: Recharts (time series, Monte Carlo, allocation, heatmap).
- **Animation**: Framer Motion (`containerVariants`, `itemVariants`, etc.).
- **Auth**: Clerk for App Router in keyless mode (`@clerk/nextjs`).

### 2. High-Level Layout

- **Entry**: `app/layout.tsx`
  - Sets global fonts (Geist), dark theme, and analytics.
  - Wraps the app in `<ClerkProvider>` and renders a global header with:
    - `<Show when="signed-out">` → `<SignInButton>`, `<SignUpButton>`.
    - `<Show when="signed-in">` → `<UserButton>`.
- **Dashboard Page**: `app/page.tsx`
  - Uses `useMemo` to generate all mock data once:
    - KPIs, allocation, time series, correlation matrix, risk alerts, holdings, Monte Carlo paths, market status.
  - Layout:
    - **Navbar** (`components/dashboard/Navbar.tsx`) – brand, breadcrumb, live market badge.
    - **Hero section** – marketing headline, CTA (“Go to Dashboard”), animated gradient/particles, mini-dashboard summary using live KPI data.
    - **Main dashboard** (`motion.main`):
      - KPI strip at top.
      - Middle grid: allocation pie + correlation heatmap + portfolio value chart.
      - Lower grid: risk alerts + Monte Carlo panel.
      - Full-width holdings table at the bottom.

### 3. Data Layer (`lib/mockData.ts`)

All data is synthetic but shaped like realistic portfolio/risk data:

- **KPIs**: `generateKPIMetrics()` – anchored around ₹2,15,43,200 with randomized daily P&L, VaR, Sharpe, beta.
- **Asset Allocation**: `generateAssetAllocation()` – Indian-oriented buckets (Large/Mid+Small Cap, G-Sec, Gold, Alternatives).
- **Time Series**: `generateTimeSeriesData(days)` – INR-denominated random walk with small drift and ~±1.5% daily volatility. Stores:
  - `date` (ISO), `time` (IST, `en-IN`), `value`, `pnl`.
- **Correlation Matrix**: `generateCorrelationMatrix()` – 8×8 matrix for Indian/FX/vol tickers:
  - `NIFTY50`, `SENSEX`, `NIFTYIT`, `GSEC`, `GOLDBEES`, `BTCINR`, `INDIAVIX`, `USDINR`.
- **Risk Alerts**: `generateRiskAlerts()` – structured alert objects with severity, title, description, timestamp, and icon.
- **Holdings**: `generateAssetHoldings()` – holdings for Indian indices, gold ETF, BTCINR, etc. with weights, expected returns, vol, VaR contribution, beta, values.
- **Monte Carlo**: `generateMonteCarloSimulation(scenarios, daysAhead)` – geometric Brownian-style simulation around the same INR base:
  - Produces `paths` and summary stats per day: `mean`, `ci95Lower/Upper`, `ci68Lower/Upper`.
- **Market Status**: `getMarketStatus()` – NSE/BSE hours in IST; returns `isOpen`, `status`, `nextEvent` text.

### 4. Dashboard Components

- **Navbar** (`Navbar.tsx`)
  - Shows logo, breadcrumb, and animated market status pill (open/closed, NSE/BSE message).
- **KPIs** (`KPIStrip.tsx`, `KPICounter.tsx`)
  - KPIs arranged in a responsive grid.
  - `KPICounter` animates numbers, formats INR (`₹` with `en-IN` locale) or ratios/percentages.
  - Uses sans-serif Geist with semi-bold weight, green/red color coding, and a subtle border/glow.
- **Portfolio Allocation** (`PortfolioAllocation.tsx`)
  - Recharts `PieChart` with allocation legend.
  - Custom tooltip shows segment name, % weight, and INR notional.
- **Correlation Heatmap** (`RiskHeatmap.tsx`)
  - SVG-based heatmap; each cell:
    - Fixed minimum size (56×56px).
    - Color-coded by correlation value (red for positive, blue for negative, neutral greys).
    - Value rendered to 2 decimals.
  - Row/column labels with padding and horizontal scroll container.
- **Portfolio Value Chart** (`PLChart.tsx`)
  - Recharts `AreaChart` with:
    - Timeframe toggle (1D / 1W / 1M / 1Y).
    - X-axis labels:
      - 1D → times.
      - 1W/1M/1Y → `"dd Mon"` dates.
    - Y-axis uses a dynamic domain around min/max of the filtered series with padding so the line isn’t flat.
  - Tooltip shows date/time in IST, INR value, and P&L in INR.
  - Footer stats: High / Current / Low in `₹` with Indian comma formatting.
- **Risk Alerts** (`RiskAlertFeed.tsx`)
  - Scrollable list of alerts, color-coded by severity.
  - Acknowledge button with framer-motion slide-out and progress indicator for critical items.
- **Monte Carlo Simulation** (`MonteCarloPanel.tsx`)
  - Uses `generateMonteCarloSimulation` output and client-side re-runs:
    - Local `simData` state initialized from server data.
    - **Run Simulation** triggers a fresh simulation and updates the chart.
  - Built with Recharts `ComposedChart`:
    - X-axis: `day` 0–30.
    - Y-axis: INR values with dynamic domain derived from 95% CI.
    - 95% band: cyan gradient `Area` between `[ci95Lower, ci95Upper]`.
    - 68% band: inner green `Area` between `[ci68Lower, ci68Upper]`.
    - Mean path: cyan `Line` on top.
  - Tooltip shows Day, mean, and both confidence intervals in INR.
  - Summary cards: Mean, 95% Upper, 95% Lower, and Range.
- **Holdings Table** (`AssetTable.tsx`)
  - Searchable, sortable table with:
    - Symbol/name, weight bar, expected return, volatility, VaR contribution, beta, and 24h change.
  - Sorts by selected column and uses mono values for numeric fields.

### 5. Styling & Design System

- **Theme**: single dark fintech theme defined in `app/globals.css` via CSS variables:
  - Backgrounds, surface, primary/secondary/accent/destructive colors.
  - Chart colors (`--chart-1`–`--chart-5`).
  - Shared radius and sidebar vars.
- **Utilities** (Tailwind layers):
  - `.glassmorphic`: blurred, translucent card with `border: 1px solid rgba(255,255,255,0.08)` and rounded corners.
  - `.glow-*`: primary/success/danger/warning drop-shadows.
  - Custom scrollbars (`.custom-scrollbar`) for tables/feeds.
  - Animation keyframes: shimmer, pulse, data-flow, SVG dash.
- **Hero visuals**:
  - CSS-based animated gradient orbits and grid overlay (`hero-orbit-*`, `hero-grid`) defined inline in `page.tsx`.

### 6. Authentication Flow (Clerk)

- **Middleware**: `proxy.ts` with `clerkMiddleware()` and recommended matcher for app + API routes.
- **Provider & Components**:
  - `ClerkProvider` wraps the entire app in `app/layout.tsx`.
  - `<Show when="signed-out">` renders `SignInButton` and `SignUpButton` as styled buttons in the global header.
  - `<Show when="signed-in">` renders `UserButton` for profile and sign-out.
- **Mode**: Keyless / development mode (no env vars required); Clerk generates temporary keys and can later be configured via its dashboard.

### 7. Data & Performance Considerations

- All mock data is generated once per page render inside `useMemo` in `app/page.tsx` to avoid recalculation on each re-render.
- Charts and cards are pure-presentational components that receive data via props; no additional data fetching occurs on the client.
- Monte Carlo simulation is:
  - Precomputed on the server for initial render.
  - Recomputed on the client only when **Run Simulation** is clicked to keep initial load fast.

### 8. Extensibility Notes

- **Real data integration**:
  - Replace `lib/mockData.ts` generators with calls to your APIs or risk engine.
  - Keep existing TypeScript interfaces to minimize component changes.
- **Additional views**:
  - New dashboard sections can follow the existing pattern: create a card-style component under `components/dashboard/` and compose it inside `app/page.tsx` within the grid system.
- **Auth-protected routes**:
  - Use Clerk’s `auth()` helpers from `@clerk/nextjs/server` in new route handlers or server components to gate certain parts of the dashboard behind authentication.

