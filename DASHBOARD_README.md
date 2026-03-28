# RiskOS - Premium Fintech Portfolio Risk Dashboard

A stunning, animation-centric dashboard for portfolio risk management. Built with React, Framer Motion, and Recharts.

## Visual Design

### Color Palette
- **Background**: Deep Navy `#0A0E1A`
- **Primary Accent**: Electric Blue `#00D4FF`
- **Gains**: Neon Green `#00FF88`
- **Losses/Risk**: Crimson Red `#FF3B5C`
- **Warnings**: Muted Gold `#FFB347`

### Typography
- **Headings**: Geist Font Family, bold weights
- **Body**: Geist, regular weight
- **Data**: Monospace font for ticker values

### Effects
- **Glassmorphism**: Frosted glass cards with `backdrop-blur-md` and transparent borders
- **Glow Effects**: Dynamic shadows on hover using CSS custom properties
- **Shimmer Loading**: Gradient animation on skeleton loaders
- **Micro-interactions**: Scale and opacity transitions on all interactive elements

## Page Structure

### 1. **Navbar** (`components/dashboard/Navbar.tsx`)
- Logo with animated entrance
- Breadcrumb navigation
- Live market status indicator (pulsing dot)
- Notification bell with badge
- Settings and user avatar buttons

### 2. **KPI Strip** (`components/dashboard/KPIStrip.tsx`)
Hero metrics with animated number counters:
- Total Portfolio Value
- Daily P&L (with trend indicator)
- Value at Risk (95%)
- Sharpe Ratio
- Portfolio Beta

### 3. **Portfolio Allocation** (`components/dashboard/PortfolioAllocation.tsx`)
- Animated donut chart showing asset class breakdown
- Interactive legend with hover effects
- Segments draw in sequentially on load
- Percentage and value display on hover

### 4. **Risk Heatmap** (`components/dashboard/RiskHeatmap.tsx`)
- SVG-based correlation matrix
- Color scale: Red (high correlation) → White (neutral) → Blue (negative)
- Cell highlighting on hover with glow effect
- Animated value displays

### 5. **Portfolio Value Chart** (`components/dashboard/PLChart.tsx`)
- Area chart with gradient fill
- Timeframe toggle: 1D, 1W, 1M, 1Y
- Custom tooltip showing date, value, and P&L
- High/Low/Current statistics footer

### 6. **Risk Alert Feed** (`components/dashboard/RiskAlertFeed.tsx`)
- Real-time scrollable feed of risk alerts
- Severity-based color coding (Critical/Warning/Info)
- Alert acknowledgment with animation
- Auto-disappearing acknowledged items
- Custom scrollbar styling

### 7. **Monte Carlo Simulation** (`components/dashboard/MonteCarloPanel.tsx`)
- Scatter plot of 200 simulated portfolio paths
- Confidence interval bands (95%, 68%)
- Mean path reference line
- Run simulation button with loading animation
- Statistics panel showing range, mean, CI bounds

### 8. **Asset Holdings Table** (`components/dashboard/AssetTable.tsx`)
- Sortable columns (click headers to sort)
- Search functionality
- Columns: Symbol, Weight, Expected Return, Volatility, VaR Contribution, Beta, 24h Change
- Row hover highlighting
- Animated weight visualizer bars
- Responsive stacking on mobile

## Animation System

### Core Animations Library (`lib/animations.ts`)
Centralized animation configurations using Framer Motion:

- **Page Load**: Staggered fade-in + slide-up for all modules (80ms delay between each)
- **Number Counters**: 1.2s ease-out animation from 0 to final value
- **Chart Draws**: SVG stroke-dash animation for line charts
- **Hover Effects**: Scale and glow transitions
- **Scroll Triggers**: IntersectionObserver for fade-in on scroll
- **Alert Slides**: Spring-based slide-in from right with bounce

### Easing Functions
- `outExpo`: Premium bouncy feel for important animations
- `outCubic`: Smooth deceleration for general UI
- `easeInOutQuart`: Symmetrical easing for reversible animations

## Mock Data System

### Data Generators (`lib/mockData.ts`)
Realistic financial data with proper distributions:

- **KPI Metrics**: Portfolio value, P&L, VaR, Sharpe ratio, beta
- **Asset Allocation**: 5 asset classes with weights and risk metrics
- **Time Series**: 30-day historical portfolio values
- **Correlation Matrix**: 8x8 realistic asset correlations
- **Risk Alerts**: 5 realistic risk scenarios (VaR breach, concentration, volatility spike)
- **Asset Holdings**: 8 individual holdings with full metrics
- **Monte Carlo**: 200 simulated paths, 30-day horizon with confidence intervals
- **Market Status**: Real-time market open/closed indicator

## Component Architecture

```
app/
├── page.tsx                           # Main dashboard orchestrator
└── layout.tsx                         # Root layout with dark theme

components/
└── dashboard/
    ├── Navbar.tsx                     # Top navigation
    ├── KPICounter.tsx                 # Individual KPI card
    ├── KPIStrip.tsx                   # KPI row (uses KPICounter)
    ├── PortfolioAllocation.tsx        # Pie chart
    ├── RiskHeatmap.tsx                # SVG correlation matrix
    ├── PLChart.tsx                    # Area chart
    ├── RiskAlertFeed.tsx              # Alert list
    ├── MonteCarloPanel.tsx            # Scatter plot simulation
    ├── AssetTable.tsx                 # Holdings table
    └── SkeletonLoader.tsx             # Loading states

lib/
├── animations.ts                      # Framer Motion configurations
├── mockData.ts                        # Data generators and types
└── utils.ts                           # Utility functions

styles/
└── globals.css                        # Theme, animations, scrollbars
```

## Responsive Design

### Desktop (lg and up)
- Full sidebar (future enhancement)
- 3-column grid layouts
- All interactive features enabled

### Tablet (md to lg)
- 2-column grids
- Stacked module sections
- Optimized touch targets

### Mobile (sm and below)
- 1-column layout
- Bottom navigation (future enhancement)
- Vertical scrolling for all panels
- Simplified table views

## Performance Optimizations

1. **Memoization**: KPI and data generation memoized at page level
2. **Lazy Animations**: Components animate only when visible (IntersectionObserver)
3. **SVG Optimization**: Correlation heatmap uses SVG for efficient rendering
4. **Chart Caching**: Recharts charts cache rendered output
5. **CSS Custom Properties**: Enables fast color theme switching

## Customization

### Changing Colors
Edit CSS custom properties in `app/globals.css`:
```css
:root {
  --primary: #00D4FF;
  --secondary: #00FF88;
  --accent: #FFB347;
  --destructive: #FF3B5C;
}
```

### Adjusting Animation Speed
Modify easing and duration in `lib/animations.ts`:
```typescript
export const itemVariants = {
  visible: {
    transition: {
      duration: 0.6,  // Change this
      ease: easings.outCubic,
    },
  },
};
```

### Updating Mock Data
Regenerate with different parameters in `lib/mockData.ts`:
```typescript
generateTimeSeriesData(60)  // 60 days instead of 30
generateMonteCarloSimulation(500, 60)  // 500 paths, 60-day horizon
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android)

Note: CSS custom properties and CSS Grid required. SVG animations work across all modern browsers.

## Future Enhancements

1. **Real Data Integration**: Connect to live market data APIs
2. **User Authentication**: Login and personalized dashboards
3. **Advanced Filters**: Asset class filters, date range pickers
4. **Export Features**: PDF/PNG export of charts and reports
5. **Dark/Light Mode Toggle**: Theme switching (foundation already in place)
6. **Sidebar Navigation**: Collapsible sidebar with additional modules
7. **Real-time Updates**: WebSocket integration for live data
8. **Risk Scenarios**: User-defined stress tests and scenario analysis
9. **Portfolio Optimization**: Efficient frontier visualization
10. **Backtesting**: Historical performance analysis tools

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

Visit `http://localhost:3000` to view the dashboard.

## Tech Stack

- **Framework**: Next.js 16
- **UI Library**: React 19
- **Animations**: Framer Motion 11
- **Charts**: Recharts 2.15
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Fonts**: Geist (via Next.js)

---

Built with precision for hedge funds and institutional investors. Every pixel, every animation, every number counts.
