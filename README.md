# 🏒 NHL Player Dashboard

A real-time NHL dashboard with live scores, playoff brackets, career stats, and team browsing. Built with React + Vite and powered by the public NHL API.

🔗 **Live:** https://nhl-player-dashboard.vercel.app

## ✨ Features

- 🏆 **2026 Playoff Bracket** — Live tournament tree with series scores, auto-falls back to a projected bracket when playoffs haven't started
- 📺 **Games & Scores** — Live scores, series context ("R1 · Game 3"), weekly schedule, and a date picker to jump to any day
- 📊 **Player Dashboard** — Career line chart, last-20 game log bar chart, full stats table, and regular-season/playoffs tabs
- 🆚 **Player Comparison** — Overlay two careers on one chart to compare
- 🔥 **Trending Players** — Top point-streaks from the last 10 games
- 🥇 **League Leaders** — Top skaters, goalies, and teams (regular season); skaters + goalies only during playoffs
- 🏟️ **Browse by Team** — Full league by division in regular season, narrowed to the 16 playoff clubs during playoffs

## 🛠️ Tech Stack

| | |
|---|---|
| **UI** | React 18 + Vite 5 |
| **Charts** | Recharts 2 |
| **Styling** | Plain CSS with CSS custom properties |
| **Data** | NHL public API (`api-web.nhle.com`) |
| **Host** | Vercel |

## 🚀 Getting Started

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # production build
npm run preview  # preview the production build locally
```

No API keys required — all data comes from the public NHL endpoints, proxied through Vite in dev and Vercel rewrites in production.

## 📁 Project Structure

```
src/
├── components/       # UI components (bracket, scoreboard, leaders, charts, ...)
├── hooks/            # Data-fetching hooks (player, game log, bracket, standings)
└── utils/            # Formatters, stats helpers, bracket projection
```
