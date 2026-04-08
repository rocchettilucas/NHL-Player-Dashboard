# NHL Player Analytics Dashboard

A real-time NHL player statistics dashboard built with React + Vite. Search any active or historical player and explore their career stats, season-by-season breakdowns, and live game log — all sourced directly from the public NHL API.

## Features

- **Player Search** — Live debounced search with dropdown, pre-populated with current season's top point scorers
- **Player Profile** — Headshot, team logo, jersey number, position, age, height/weight, and career totals
- **Career Stats Chart** — Line chart (Goals / Assists / Points per season) with per-series toggle buttons
- **Game Log Chart** — Stacked bar chart of the last 20 games, with a rich tooltip showing opponent, TOI, +/-, PP points, and more
- **Career Stats Table** — All NHL regular seasons, newest first, with the current season highlighted
- **Player Comparison** — Add a second player to overlay both careers on the same chart (dashed lines)

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 + Vite 5 |
| Charts | Recharts 2 |
| Styling | Plain CSS with CSS custom properties |
| Data | NHL public API (no API key required) |
| Deployment | Vercel (zero config) |

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
# → http://localhost:5173

# Build for production
npm run build

# Preview the production build locally
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── SearchBar/      # Debounced search with keyboard navigation
│   ├── PlayerHeader/   # Player identity card with career stat pills
│   ├── CareerChart/    # Toggleable line chart for career statistics
│   ├── GameLogChart/   # Stacked bar chart for recent game performance
│   ├── StatsTable/     # Full career stats table
│   ├── LoadingSpinner/ # Reusable loading indicator
│   └── ErrorBanner/    # Reusable error state with retry action
├── hooks/
│   ├── usePlayer.js    # Fetches player landing data (with cache)
│   ├── useGameLog.js   # Fetches current-season game log (with cache)
│   └── useSearch.js    # Debounced search + stats leaders pre-population
└── utils/
    ├── formatters.js   # Season strings, age, height, date formatting
    └── statsHelpers.js # Data transformation for charts and table
```

## NHL API

All data comes directly from the NHL's public API — no authentication required:

| Purpose | Endpoint |
|---|---|
| Player search | `search.d3.hockey/solr/nhle/select?q={name}` (proxied) |
| Player profile & career stats | `api-web.nhle.com/v1/player/{id}/landing` |
| Current season game log | `api-web.nhle.com/v1/player/{id}/game-log/now` |
| Stats leaders (search pre-population) | `api-web.nhle.com/v1/skater-stats-leaders/{season}/2` |

The `search.d3.hockey` endpoint requires a server-side proxy to avoid CORS restrictions. In development, Vite's proxy handles this automatically. In production on Vercel, the `vercel.json` rewrite rule forwards `/solr/*` requests to the search server.

## Deployment

Push to GitHub and connect the repository in the [Vercel dashboard](https://vercel.com/new). Vercel auto-detects the Vite framework — no environment variables or build configuration needed. The `vercel.json` in the project root handles the search proxy rewrite automatically.
