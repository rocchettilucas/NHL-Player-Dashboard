# NHL Player Dashboard — Playoffs Section Design

**Date:** 2026-04-16
**Status:** Approved
**Approach:** Playoff Mode as Global State (Approach 1)

---

## Overview

Add a comprehensive playoffs section integrated into the existing home page. The playoff bracket is the hero feature, always visible during playoffs. A shared toggle lets users switch between playoff and regular season data across all stats sections. The player dashboard gains a Playoffs tab for individual playoff performance. Navigation is enhanced with context-aware back buttons.

---

## 1. Home Page Layout & Toggle

### Layout During Playoffs (top to bottom)

1. **Countdown/Status Banner** — "2026 Stanley Cup Playoffs begin April [X]" with countdown before playoffs start. Becomes "Round 1 — Day 3" once active. Disappears after playoffs end.
2. **Playoff Bracket** — full interactive tournament bracket (always visible during playoffs, not affected by toggle)
3. **Popular Players Grid** — dynamically swaps to top playoff performers when in playoff mode; shows hardcoded popular players in regular season mode
4. **Season Toggle** — pill-style `[Playoffs] [Regular Season]`, defaults to "Playoffs" during playoff period
5. **Scoreboard** — responds to toggle
6. **Trending Players** — responds to toggle
7. **League Leaders** — responds to toggle (Skater Leaders, Goalie Leaders, Playoff Standings)
8. **Browse by Team** — unchanged

### State Model (App.jsx)

```
playoffMode: boolean         — auto-detected from NHL schedule API
seasonFilter: 'playoffs' | 'regular'  — user toggle, defaults to 'playoffs' when playoffMode is true
navigationSource: { from: 'home' | 'team', teamAbbrev?: string }  — tracks navigation origin
```

### Auto-Detection

The app determines if playoffs are active by checking the NHL schedule API for playoff games (game type 3) in the current schedule window. If found, `playoffMode` becomes `true` and `seasonFilter` defaults to `'playoffs'`.

---

## 2. Playoff Bracket Component

### Data Source

- **Endpoint:** `/playoffs/bracket/20252026`
- **New hook:** `usePlayoffBracket(season)` — fetches bracket data, caches it, polls every 60 seconds (same pattern as `useScores`)

### Visual Structure

- Full 4-round tournament tree: First Round (8 series) -> Second Round (4) -> Conference Finals (2) -> Stanley Cup Final (1)
- Eastern conference on top/left, Western on bottom/right
- Each matchup card shows:
  - Team logos + abbreviations
  - Series score (e.g., 3-2)
  - Higher seed listed first
  - Visual indicator for series winner (checkmark or highlight)
  - Active series get a subtle glow/accent border using `--color-accent`
  - **Elimination/Clinch badges:** red "Eliminated" tag or green "Advances" tag

### Interactions

- Clicking a matchup expands inline or in a popover showing:
  - Individual game results (scores, dates, home/away)
  - "Last time these teams met in playoffs" historical blurb (best-effort — degrades gracefully if API data unavailable)
- Clicking a team logo/name navigates to that team's page

### Responsive Design

- **Desktop (1024px+):** Traditional horizontal bracket with SVG/CSS connector lines. East on top half, West on bottom, converging at Stanley Cup Final in center-right.
- **Tablet (768px-1023px):** Compressed horizontal bracket with smaller matchup cards, 3-letter team codes, tighter spacing, simplified connector lines.
- **Mobile (<768px):** Vertical stack. Each round becomes a collapsible section. Current/active round expanded by default, completed rounds collapsed with summary (e.g., "First Round — 6 of 8 series complete"). Matchup cards go full-width.

### Pre-Playoff State

Before playoffs begin, the bracket renders with "TBD" placeholders or seeded teams based on current standings, with the countdown banner above.

---

## 3. Playoff-Aware Existing Components

### League Leaders

- `useSkaterLeaders(limit, gameType)` and `useGoalieLeaders(limit, gameType)` — add `gameType` parameter (default `2`, pass `3` for playoffs)
- Endpoints become `/skater-stats-leaders/20252026/3` and `/goalie-stats-leaders/20252026/3`
- Same tab structure: Goals, Assists, Points / Save%, GAA, Shutouts
- Team standings tab becomes **Playoff Standings** showing active teams with series record and elimination status

### Scoreboard

- When `seasonFilter === 'playoffs'`, switches to playoff-aware view
- Each game card gains series context: "Game 4 — TOR leads 2-1"
- Day tabs remain but reflect the playoff schedule
- `useScores` filters for playoff games using game type metadata from the API

### Trending Players

- When in playoff mode, shows players trending during playoffs (hot streaks, point leaders in active series)
- Same component, different data source based on `seasonFilter`

### Popular Players Grid

- When `seasonFilter === 'playoffs'`, dynamically shows top playoff performers instead of the hardcoded 10 players
- Falls back to hardcoded list during regular season

### Season Toggle

- Pill-style toggle: `[Playoffs] [Regular Season]`
- Sits between the bracket and the stats sections
- One global toggle controls Scoreboard, Trending Players, League Leaders, and Popular Players simultaneously
- Mobile: full-width pill bar
- Does NOT affect the bracket (always visible during playoffs)

---

## 4. Player Dashboard — Playoff Tab

### Tab Bar

Below the PlayerHeader, add a tab bar:
- **[Regular Season]** — existing content (CareerChart, GameLogChart, StatsTable)
- **[Playoffs]** — new playoff content

### Playoff Tab Contents

1. **Current Playoff Run Stats** — summary card showing this year's playoff totals: GP, G, A, P, +/-, TOI/game, PPG, GWG. Styled like the career totals in PlayerHeader but scoped to the current playoff run.

2. **Playoff Game Log Chart** — same `GameLogChart` component, fed by `useGameLog(playerId, 3)`. Shows all playoff games this year (not capped at 20; playoff runs are 16-28 games max).

3. **Playoff Career Stats Table** — same `StatsTable` component filtered to `gameTypeId === 3`. Shows every playoff season the player participated in, with career playoff totals at the bottom.

### Hook Changes

- `useGameLog(playerId, gameType)` — add `gameType` parameter, default `2`
- `statsHelpers.js` — add `getNHLPlayoffSeasons(playerData)` filter (gameTypeId === 3), mirroring existing `getNHLRegularSeasons()`

### Edge Case

If a player has no playoff data, the Playoffs tab shows: "No playoff stats available for 2025-26."

---

## 5. Context-Aware Navigation

### State Tracking

When navigating to a player or team, `App.jsx` records the source via `navigationSource`:
- Home -> Player: `{ from: 'home' }`
- Home -> Team -> Player: `{ from: 'team', teamAbbrev: 'TOR' }`
- Bracket -> Team -> Player: `{ from: 'team', teamAbbrev: 'TOR' }`
- Bracket/Leaders -> Player directly: `{ from: 'home' }`

### Back Button Behavior

**Player Dashboard:**
- `from: 'team'` -> "Back to [Team Name]" -> navigates to TeamPage with that team
- `from: 'home'` -> "Back to Home" -> navigates to home

**Team Page:**
- Always "Back to Home"

### Implementation

The `handleSelectPlayer` and `handleSelectTeam` functions in `App.jsx` gain a `source` parameter. Navigation state is a simple object in React state — no routing library needed.

---

## 6. Countdown/Status Banner

### States

1. **Pre-playoffs:** "2026 Stanley Cup Playoffs begin [date]" with a live countdown (days, hours)
2. **During playoffs:** "Round [N] — Day [X]" or "Conference Finals" — contextual label for the current round
3. **Post-playoffs:** Hidden (or brief "2026 Stanley Cup Champions: [Team]" celebration banner)

### Implementation

- New component: `PlayoffBanner`
- Derives state from bracket data and current date
- Styled as a subtle accent bar at the top of the home page, using `--color-accent` background

---

## 7. Responsive Design (Global)

All new and modified components follow these breakpoints:

- **Desktop (1024px+):** Full layouts, horizontal bracket, side-by-side elements
- **Tablet (768px-1023px):** Compressed layouts, smaller cards, abbreviated text
- **Mobile (<768px):** Vertical stacks, collapsible sections, full-width cards, touch-friendly tap targets

The season toggle becomes a full-width pill bar on mobile. Scoreboard cards stack vertically. Leader tables scroll horizontally if needed.

---

## 8. New Files & Modified Files

### New Components
- `src/components/PlayoffBracket/PlayoffBracket.jsx` + `PlayoffBracket.css`
- `src/components/PlayoffBanner/PlayoffBanner.jsx` + `PlayoffBanner.css`
- `src/components/SeasonToggle/SeasonToggle.jsx` + `SeasonToggle.css`

### New Hooks
- `src/hooks/usePlayoffBracket.js`

### Modified Hooks
- `src/hooks/useLeaders.js` — add `gameType` parameter
- `src/hooks/useGameLog.js` — add `gameType` parameter
- `src/hooks/useScores.js` — playoff game filtering

### Modified Components
- `src/App.jsx` — new state (`playoffMode`, `seasonFilter`, `navigationSource`), layout changes
- `src/components/Scoreboard/Scoreboard.jsx` — series context display
- `src/components/LeagueLeaders/LeagueLeaders.jsx` — accept `gameType` prop, playoff standings tab
- `src/components/TrendingPlayers/TrendingPlayers.jsx` — accept `gameType` prop
- `src/components/PlayerHeader/PlayerHeader.jsx` — tab bar (Regular Season / Playoffs)
- `src/components/StatsTable/StatsTable.jsx` — accept playoff season filter
- `src/components/GameLogChart/GameLogChart.jsx` — remove 20-game cap for playoffs

### Modified Utils
- `src/utils/statsHelpers.js` — add `getNHLPlayoffSeasons()`, update `prepareGameLog()` for variable game counts

---

## 9. NHL API Endpoints (New)

| Purpose | Endpoint | Game Type |
|---------|----------|-----------|
| Playoff bracket | `GET /playoffs/bracket/20252026` | N/A |
| Playoff skater leaders | `GET /skater-stats-leaders/20252026/3` | 3 |
| Playoff goalie leaders | `GET /goalie-stats-leaders/20252026/3` | 3 |
| Player playoff game log | `GET /player/{id}/game-log/20252026/3` | 3 |
| Playoff scores (daily) | `GET /score/{YYYY-MM-DD}` (filter by type) | 3 |
