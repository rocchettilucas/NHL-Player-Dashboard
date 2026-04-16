# Playoffs Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a comprehensive playoffs section to the NHL Player Dashboard — interactive bracket, season toggle, playoff-aware stats, player playoff tab, and context-aware navigation.

**Architecture:** A single `playoffMode` boolean (auto-detected) and `seasonFilter` state in `App.jsx` cascade to all components. Existing hooks gain a `gameType` parameter (2=regular, 3=playoffs). The bracket is the only entirely new visual component; everything else extends existing components. A `navigationSource` state object enables context-aware back buttons.

**Tech Stack:** React 18, Recharts, Vite, plain CSS with CSS custom properties, NHL Web API (`api-web.nhle.com`)

**Spec:** `docs/superpowers/specs/2026-04-16-playoffs-section-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/hooks/usePlayoffBracket.js` | Fetch & poll `/playoffs/bracket/20252026`, cache & map bracket data |
| `src/components/PlayoffBracket/PlayoffBracket.jsx` | Full interactive 4-round tournament bracket visualization |
| `src/components/PlayoffBracket/PlayoffBracket.css` | Bracket styles — desktop horizontal, tablet compressed, mobile vertical |
| `src/components/PlayoffBanner/PlayoffBanner.jsx` | Countdown / round status banner above bracket |
| `src/components/PlayoffBanner/PlayoffBanner.css` | Banner styles |
| `src/components/SeasonToggle/SeasonToggle.jsx` | Pill-style `[Playoffs] [Regular Season]` toggle |
| `src/components/SeasonToggle/SeasonToggle.css` | Toggle styles, responsive full-width on mobile |

### Modified Files
| File | Changes |
|------|---------|
| `src/hooks/useLeaders.js` | Add `gameType` parameter to `useSkaterLeaders` and `useGoalieLeaders` |
| `src/hooks/useGameLog.js` | Add `gameType` parameter, adjust cache key |
| `src/hooks/useScores.js` | Add `gameType` to `mapGame`, expose it for filtering |
| `src/utils/statsHelpers.js` | Add `getNHLPlayoffSeasons()`, `getPlayoffTableSeasons()`, update `prepareGameLog()` for variable count |
| `src/App.jsx` | Add `playoffMode`, `seasonFilter`, `navigationSource` state; new layout with bracket/banner/toggle; pass `gameType` to children; context-aware navigation handlers |
| `src/App.css` | Styles for season toggle area, player-dashboard tab bar |
| `src/components/LeagueLeaders/LeagueLeaders.jsx` | Accept `gameType` prop, pass to hooks |
| `src/components/Scoreboard/Scoreboard.jsx` | Accept `gameType` prop, show series context for playoff games |
| `src/components/TrendingPlayers/TrendingPlayers.jsx` | Accept `gameType` prop, fetch playoff leaders when `gameType=3` |
| `src/components/PlayerHeader/PlayerHeader.jsx` | No changes needed (tab bar lives in App.jsx) |
| `src/components/StatsTable/StatsTable.jsx` | Accept `gameType` prop, use playoff filter when `gameType=3` |
| `src/components/GameLogChart/GameLogChart.jsx` | Accept optional `gameCount` prop to override 20-game cap |
| `src/components/TeamPage/TeamPage.jsx` | Accept `onBack` with context-aware label |

---

### Task 1: Add `gameType` Parameter to `useLeaders` Hook

**Files:**
- Modify: `src/hooks/useLeaders.js`

- [ ] **Step 1: Update `useSkaterLeaders` to accept `gameType`**

In `src/hooks/useLeaders.js`, change the function signature and URL:

```jsx
// src/hooks/useLeaders.js — lines 4, 11, 17-18, 42
const CURRENT_SEASON = '20252026'

export function useSkaterLeaders(limit = 10, gameType = 2) {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    fetch(
      `/nhl-api/v1/skater-stats-leaders/${CURRENT_SEASON}/${gameType}?categories=goals,assists,points&limit=${limit}`
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        setState({
          data: {
            goals: (data.goals ?? []).map(mapLeader),
            assists: (data.assists ?? []).map(mapLeader),
            points: (data.points ?? []).map(mapLeader),
          },
          loading: false,
          error: null,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setState({ data: null, loading: false, error: err.message })
      })

    return () => { cancelled = true }
  }, [limit, gameType])

  return state
}
```

- [ ] **Step 2: Update `useGoalieLeaders` to accept `gameType`**

Same pattern — change signature and URL:

```jsx
// src/hooks/useLeaders.js — lines 52, 58-59, 83
export function useGoalieLeaders(limit = 10, gameType = 2) {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    fetch(
      `/nhl-api/v1/goalie-stats-leaders/${CURRENT_SEASON}/${gameType}?categories=savePctg,goalsAgainstAverage,shutouts&limit=${limit}`
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        setState({
          data: {
            savePctg: (data.savePctg ?? []).map(mapLeader),
            gaa: (data.goalsAgainstAverage ?? []).map(mapLeader),
            shutouts: (data.shutouts ?? []).map(mapLeader),
          },
          loading: false,
          error: null,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setState({ data: null, loading: false, error: err.message })
      })

    return () => { cancelled = true }
  }, [limit, gameType])

  return state
}
```

- [ ] **Step 3: Verify the app still loads with no regressions**

Run: `npm run dev`

Open browser, confirm League Leaders section loads as before (defaults to gameType=2).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useLeaders.js
git commit -m "feat: add gameType parameter to useSkaterLeaders and useGoalieLeaders hooks"
```

---

### Task 2: Add `gameType` Parameter to `useGameLog` Hook

**Files:**
- Modify: `src/hooks/useGameLog.js`

- [ ] **Step 1: Update hook signature, cache key, and URL**

Replace the entire hook in `src/hooks/useGameLog.js`:

```jsx
import { useState, useEffect } from 'react'

// Module-level cache: "playerId-gameType" → game log array
const CACHE = new Map()

/**
 * Fetch the current-season game log for a player.
 * @param {number|null} playerId
 * @param {number} gameType - 2 for regular season, 3 for playoffs
 * @returns {{ gameLog: object[], loading: boolean, error: string|null, retry: () => void }}
 */
export function useGameLog(playerId, gameType = 2) {
  const [state, setState] = useState({ gameLog: [], loading: false, error: null })
  const [retryCount, setRetryCount] = useState(0)

  const cacheKey = playerId ? `${playerId}-${gameType}` : null

  useEffect(() => {
    if (!playerId) {
      setState({ gameLog: [], loading: false, error: null })
      return
    }

    if (CACHE.has(cacheKey)) {
      setState({ gameLog: CACHE.get(cacheKey), loading: false, error: null })
      return
    }

    let cancelled = false
    setState({ gameLog: [], loading: true, error: null })

    fetch(`/nhl-api/v1/player/${playerId}/game-log/20252026/${gameType}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        const log = data.gameLog ?? []
        CACHE.set(cacheKey, log)
        setState({ gameLog: log, loading: false, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        const msg = navigator.onLine
          ? `Could not load game log. ${err.message}`
          : 'Check your connection and try again.'
        setState({ gameLog: [], loading: false, error: msg })
      })

    return () => {
      cancelled = true
    }
  }, [playerId, gameType, retryCount, cacheKey])

  const retry = () => {
    CACHE.delete(cacheKey)
    setRetryCount((c) => c + 1)
  }

  return { ...state, retry }
}
```

- [ ] **Step 2: Verify the app still loads — game log chart works as before**

Run: `npm run dev`

Click a player, confirm game log chart loads.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGameLog.js
git commit -m "feat: add gameType parameter to useGameLog hook with composite cache key"
```

---

### Task 3: Add Playoff Helpers to `statsHelpers.js`

**Files:**
- Modify: `src/utils/statsHelpers.js`

- [ ] **Step 1: Add `getNHLPlayoffSeasons` function**

Add after the existing `getNHLRegularSeasons` function (after line 21):

```jsx
/**
 * Filter and map a player's seasonTotals to NHL playoff data,
 * sorted chronologically (oldest first) for charting.
 */
export function getNHLPlayoffSeasons(playerData) {
  if (!playerData?.seasonTotals) return []
  return playerData.seasonTotals
    .filter((s) => s.leagueAbbrev === 'NHL' && s.gameTypeId === 3)
    .map((s) => ({
      season: formatSeason(s.season),
      rawSeason: s.season,
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
      points: s.points ?? 0,
      gamesPlayed: s.gamesPlayed ?? 0,
      team: extractStr(s.teamCommonName) || extractStr(s.teamName) || s.teamAbbrev || '',
    }))
    .sort((a, b) => a.rawSeason - b.rawSeason)
}
```

- [ ] **Step 2: Add `getPlayoffTableSeasons` function**

Add after the existing `getTableSeasons` function (after line 44):

```jsx
/**
 * Build playoff table rows from a player's seasonTotals, newest first.
 * currentSeason is the raw season integer (e.g. 20252026) used to flag the active row.
 */
export function getPlayoffTableSeasons(seasonTotals, currentSeason) {
  if (!seasonTotals) return []
  return seasonTotals
    .filter((s) => s.leagueAbbrev === 'NHL' && s.gameTypeId === 3)
    .map((s) => ({
      season: formatSeason(s.season),
      rawSeason: s.season,
      team: extractStr(s.teamCommonName) || extractStr(s.teamName) || s.teamAbbrev || '',
      gamesPlayed: s.gamesPlayed ?? 0,
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
      points: s.points ?? 0,
      plusMinus: s.plusMinus ?? 0,
      pim: s.pim ?? 0,
      isCurrent: s.season === currentSeason,
    }))
    .sort((a, b) => b.rawSeason - a.rawSeason)
}
```

- [ ] **Step 3: Update `prepareGameLog` to accept variable count**

Change line 49 to make the count parameter more flexible:

```jsx
/**
 * Prepare games from a game log for the bar chart.
 * @param {Array} gameLog - raw game log data
 * @param {number|null} count - number of games to show, or null for all games
 */
export function prepareGameLog(gameLog, count = 20) {
  if (!gameLog?.length) return []
  const sorted = [...gameLog].sort((a, b) => a.gameDate.localeCompare(b.gameDate))
  const sliced = count ? sorted.slice(-count) : sorted
  return sliced.map((g, i) => ({
    index: i + 1,
    label: formatGameDate(g.gameDate),
    gameDate: g.gameDate,
    opponent: g.opponentAbbrev ?? '',
    opponentFull: extractStr(g.opponentCommonName) || g.opponentAbbrev || '',
    homeAway: g.homeRoadFlag === 'H' ? 'vs' : '@',
    goals: g.goals ?? 0,
    assists: g.assists ?? 0,
    points: g.points ?? 0,
    plusMinus: g.plusMinus ?? 0,
    toi: g.toi ?? '0:00',
    shots: g.shots ?? 0,
    ppPoints: g.powerPlayPoints ?? 0,
    pim: g.pim ?? 0,
  }))
}
```

- [ ] **Step 4: Add `extractPlayoffCareerTotals` function**

Add after the existing `extractCareerTotals` (after line 107):

```jsx
/**
 * Extract playoff career totals from the player data object.
 */
export function extractPlayoffCareerTotals(playerData) {
  const c = playerData?.careerTotals?.playoffs
  if (!c) return null
  return {
    gp: c.gamesPlayed ?? 0,
    g: c.goals ?? 0,
    a: c.assists ?? 0,
    pts: c.points ?? 0,
  }
}
```

- [ ] **Step 5: Verify no regressions — existing chart/table still work**

Run: `npm run dev`

Click a player, confirm career chart and stats table render correctly.

- [ ] **Step 6: Commit**

```bash
git add src/utils/statsHelpers.js
git commit -m "feat: add playoff season helpers and flexible game log count to statsHelpers"
```

---

### Task 4: Add `gameType` to `useScores` and Expose It in Game Data

**Files:**
- Modify: `src/hooks/useScores.js`

- [ ] **Step 1: Add `gameType` to `mapGame`**

In `src/hooks/useScores.js`, update the `mapGame` function (line 107) to include game type and series info:

```jsx
function mapGame(g) {
  return {
    id: g.id,
    gameState: g.gameState ?? '',
    gameDate: g.gameDate ?? '',
    startTimeUTC: g.startTimeUTC ?? '',
    venue: extractStr(g.venue) || '',
    awayTeam: mapTeam(g.awayTeam),
    homeTeam: mapTeam(g.homeTeam),
    period: g.periodDescriptor?.number ?? null,
    periodType: g.periodDescriptor?.periodType ?? '',
    clock: g.clock?.timeRemaining ?? '',
    inIntermission: g.clock?.inIntermission ?? false,
    gameType: g.gameType ?? 2,
    seriesStatus: g.seriesStatus ?? null,
  }
}
```

- [ ] **Step 2: Verify scoreboard still works**

Run: `npm run dev`

Confirm scoreboard renders.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useScores.js
git commit -m "feat: expose gameType and seriesStatus in score data"
```

---

### Task 5: Create `SeasonToggle` Component

**Files:**
- Create: `src/components/SeasonToggle/SeasonToggle.jsx`
- Create: `src/components/SeasonToggle/SeasonToggle.css`

- [ ] **Step 1: Create the component**

```jsx
// src/components/SeasonToggle/SeasonToggle.jsx
import './SeasonToggle.css'

export function SeasonToggle({ value, onChange }) {
  return (
    <div className="season-toggle">
      <button
        className={`season-toggle__btn ${value === 'playoffs' ? 'season-toggle__btn--active' : ''}`}
        onClick={() => onChange('playoffs')}
      >
        Playoffs
      </button>
      <button
        className={`season-toggle__btn ${value === 'regular' ? 'season-toggle__btn--active' : ''}`}
        onClick={() => onChange('regular')}
      >
        Regular Season
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create the styles**

```css
/* src/components/SeasonToggle/SeasonToggle.css */
.season-toggle {
  display: inline-flex;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-1);
  gap: var(--space-1);
}

.season-toggle__btn {
  padding: var(--space-2) var(--space-5);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition: color var(--transition-fast), background var(--transition-fast);
}

.season-toggle__btn:hover {
  color: var(--color-text-primary);
}

.season-toggle__btn--active {
  background: var(--color-accent-dark);
  color: var(--color-text-primary);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

@media (max-width: 640px) {
  .season-toggle {
    display: flex;
    width: 100%;
  }

  .season-toggle__btn {
    flex: 1;
    text-align: center;
  }
}
```

- [ ] **Step 3: Verify component renders in isolation**

Temporarily import and render `<SeasonToggle value="playoffs" onChange={console.log} />` in `App.jsx` to confirm it renders. Remove after verifying.

- [ ] **Step 4: Commit**

```bash
git add src/components/SeasonToggle/SeasonToggle.jsx src/components/SeasonToggle/SeasonToggle.css
git commit -m "feat: create SeasonToggle pill-style component"
```

---

### Task 6: Create `PlayoffBanner` Component

**Files:**
- Create: `src/components/PlayoffBanner/PlayoffBanner.jsx`
- Create: `src/components/PlayoffBanner/PlayoffBanner.css`

- [ ] **Step 1: Create the component**

```jsx
// src/components/PlayoffBanner/PlayoffBanner.jsx
import { useState, useEffect } from 'react'
import './PlayoffBanner.css'

/**
 * Displays a contextual banner above the bracket:
 * - Pre-playoffs: countdown to start date
 * - During playoffs: current round label
 * - Post-playoffs: champion announcement (or hidden)
 *
 * @param {{ bracketData: object|null }} props
 */
export function PlayoffBanner({ bracketData }) {
  const [now, setNow] = useState(() => new Date())

  // Update the countdown every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  if (!bracketData) return null

  // Determine state from bracket data
  const { playoffStartDate, currentRound, champion } = parseBracketState(bracketData)

  // Post-playoffs: show champion
  if (champion) {
    return (
      <div className="playoff-banner playoff-banner--champion">
        <span className="playoff-banner__icon">🏆</span>
        <span className="playoff-banner__text">
          2026 Stanley Cup Champions: {champion}
        </span>
      </div>
    )
  }

  // Pre-playoffs: countdown
  if (playoffStartDate && now < playoffStartDate) {
    const diff = playoffStartDate - now
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    return (
      <div className="playoff-banner playoff-banner--countdown">
        <span className="playoff-banner__icon">🏒</span>
        <span className="playoff-banner__text">
          2026 Stanley Cup Playoffs begin{' '}
          {playoffStartDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          {days > 0 && <span className="playoff-banner__countdown"> — {days}d {hours}h</span>}
        </span>
      </div>
    )
  }

  // During playoffs: current round
  const roundLabels = {
    1: 'First Round',
    2: 'Second Round',
    3: 'Conference Finals',
    4: 'Stanley Cup Final',
  }

  return (
    <div className="playoff-banner playoff-banner--active">
      <span className="playoff-banner__icon">🏒</span>
      <span className="playoff-banner__text">
        2026 Stanley Cup Playoffs — {roundLabels[currentRound] ?? `Round ${currentRound}`}
      </span>
      <span className="playoff-banner__live-dot" />
    </div>
  )
}

/**
 * Parse bracket API data to determine banner state.
 * Adapts to the structure returned by /playoffs/bracket/20252026.
 */
function parseBracketState(bracketData) {
  const result = { playoffStartDate: null, currentRound: 1, champion: null }

  // Find the earliest game date across all series for countdown
  const allDates = []
  const rounds = bracketData.rounds ?? bracketData.series ?? []

  if (Array.isArray(rounds)) {
    for (const round of rounds) {
      const series = round.series ?? [round]
      for (const s of series) {
        if (s.games) {
          for (const g of s.games) {
            if (g.gameDate) allDates.push(new Date(g.gameDate))
          }
        }
      }
    }
  }

  if (allDates.length > 0) {
    allDates.sort((a, b) => a - b)
    result.playoffStartDate = allDates[0]
  }

  // Determine current active round (highest round with an incomplete series)
  if (Array.isArray(rounds)) {
    for (let i = rounds.length - 1; i >= 0; i--) {
      const round = rounds[i]
      const series = round.series ?? [round]
      const hasActive = series.some(
        (s) => s.topSeedWins != null && s.bottomSeedWins != null &&
               s.topSeedWins < 4 && s.bottomSeedWins < 4
      )
      if (hasActive) {
        result.currentRound = round.roundNumber ?? (i + 1)
        break
      }
    }
  }

  // Check for champion (round 4, series complete)
  if (Array.isArray(rounds)) {
    const finalRound = rounds.find((r) => (r.roundNumber ?? 0) === 4)
    if (finalRound) {
      const finalSeries = finalRound.series?.[0] ?? finalRound
      if (finalSeries.topSeedWins === 4) {
        result.champion = finalSeries.topSeedTeam?.name ?? finalSeries.topSeedTeam?.abbrev ?? 'TBD'
      } else if (finalSeries.bottomSeedWins === 4) {
        result.champion = finalSeries.bottomSeedTeam?.name ?? finalSeries.bottomSeedTeam?.abbrev ?? 'TBD'
      }
    }
  }

  return result
}
```

- [ ] **Step 2: Create the styles**

```css
/* src/components/PlayoffBanner/PlayoffBanner.css */
.playoff-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: 600;
  text-align: center;
}

.playoff-banner--countdown {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.playoff-banner--active {
  background: linear-gradient(135deg, rgba(31, 111, 235, 0.15), rgba(88, 166, 255, 0.1));
  border: 1px solid var(--color-accent-dark);
  color: var(--color-accent);
}

.playoff-banner--champion {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 215, 0, 0.05));
  border: 1px solid rgba(255, 215, 0, 0.4);
  color: #ffd700;
}

.playoff-banner__icon {
  font-size: var(--font-size-lg);
  line-height: 1;
}

.playoff-banner__text {
  line-height: 1.4;
}

.playoff-banner__countdown {
  color: var(--color-accent);
}

.playoff-banner__live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-goals);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@media (max-width: 640px) {
  .playoff-banner {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-xs);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PlayoffBanner/PlayoffBanner.jsx src/components/PlayoffBanner/PlayoffBanner.css
git commit -m "feat: create PlayoffBanner countdown/status component"
```

---

### Task 7: Create `usePlayoffBracket` Hook

**Files:**
- Create: `src/hooks/usePlayoffBracket.js`

- [ ] **Step 1: Create the hook**

```jsx
// src/hooks/usePlayoffBracket.js
import { useState, useEffect, useRef } from 'react'
import { extractStr } from '../utils/formatters'

const CURRENT_SEASON = '20252026'
const POLL_INTERVAL = 60_000

/**
 * Fetch the playoff bracket and poll for updates.
 * @returns {{ bracketData: object|null, loading: boolean, error: string|null }}
 */
export function usePlayoffBracket() {
  const [state, setState] = useState({ bracketData: null, loading: true, error: null })
  const intervalRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const fetchBracket = () => {
      fetch(`/nhl-api/v1/playoff-bracket/${CURRENT_SEASON}`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((data) => {
          if (cancelled) return
          setState({ bracketData: data, loading: false, error: null })
        })
        .catch((err) => {
          if (cancelled) return
          setState((prev) => ({
            bracketData: prev.bracketData,
            loading: false,
            error: err.message,
          }))
        })
    }

    fetchBracket()
    intervalRef.current = setInterval(fetchBracket, POLL_INTERVAL)

    return () => {
      cancelled = true
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return state
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/usePlayoffBracket.js
git commit -m "feat: create usePlayoffBracket hook with polling"
```

---

### Task 8: Create `PlayoffBracket` Component — Data Layer & Matchup Cards

**Files:**
- Create: `src/components/PlayoffBracket/PlayoffBracket.jsx`
- Create: `src/components/PlayoffBracket/PlayoffBracket.css`

This is the largest component. We'll build it in two tasks — data/cards first, then responsive layout and connector lines.

- [ ] **Step 1: Create the matchup card sub-component and main bracket shell**

```jsx
// src/components/PlayoffBracket/PlayoffBracket.jsx
import { useState } from 'react'
import './PlayoffBracket.css'
import { extractStr } from '../../utils/formatters'
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner'

const ROUND_LABELS = {
  1: 'First Round',
  2: 'Second Round',
  3: 'Conf. Finals',
  4: 'Stanley Cup Final',
}

/**
 * Full interactive playoff bracket.
 * @param {{ bracketData: object|null, loading: boolean, error: string|null, onSelectTeam: function }} props
 */
export function PlayoffBracket({ bracketData, loading, error, onSelectTeam }) {
  const [expandedSeries, setExpandedSeries] = useState(null)

  if (loading && !bracketData) {
    return (
      <section className="bracket-section">
        <h2 className="section-title">
          <span className="section-title__icon">🏆</span> Playoff Bracket
        </h2>
        <LoadingSpinner label="Loading playoff bracket..." />
      </section>
    )
  }

  if (error && !bracketData) {
    return (
      <section className="bracket-section">
        <h2 className="section-title">
          <span className="section-title__icon">🏆</span> Playoff Bracket
        </h2>
        <p className="bracket-error">Could not load bracket. {error}</p>
      </section>
    )
  }

  if (!bracketData) return null

  const rounds = bracketData.rounds ?? []

  // Split into conferences
  const eastern = { label: 'Eastern Conference', rounds: [] }
  const western = { label: 'Western Conference', rounds: [] }

  for (const round of rounds) {
    const roundNum = round.roundNumber ?? 0
    const series = round.series ?? []

    if (roundNum <= 2) {
      const eastSeries = series.filter((s) => (s.conference ?? '').toUpperCase() === 'E' || (s.conferenceAbbrev ?? '').toUpperCase() === 'E')
      const westSeries = series.filter((s) => (s.conference ?? '').toUpperCase() === 'W' || (s.conferenceAbbrev ?? '').toUpperCase() === 'W')
      eastern.rounds.push({ roundNumber: roundNum, series: eastSeries.length > 0 ? eastSeries : series.slice(0, series.length / 2) })
      western.rounds.push({ roundNumber: roundNum, series: westSeries.length > 0 ? westSeries : series.slice(series.length / 2) })
    } else if (roundNum === 3) {
      const eastSeries = series.filter((s) => (s.conference ?? '').toUpperCase() === 'E' || (s.conferenceAbbrev ?? '').toUpperCase() === 'E')
      const westSeries = series.filter((s) => (s.conference ?? '').toUpperCase() === 'W' || (s.conferenceAbbrev ?? '').toUpperCase() === 'W')
      if (eastSeries.length > 0) eastern.rounds.push({ roundNumber: roundNum, series: eastSeries })
      if (westSeries.length > 0) western.rounds.push({ roundNumber: roundNum, series: westSeries })
    }
  }

  const finalRound = rounds.find((r) => (r.roundNumber ?? 0) === 4)

  const toggleExpand = (seriesId) => {
    setExpandedSeries((prev) => (prev === seriesId ? null : seriesId))
  }

  return (
    <section className="bracket-section">
      <h2 className="section-title">
        <span className="section-title__icon">🏆</span> Playoff Bracket
      </h2>
      <p className="section-subtitle">2025-26 Stanley Cup Playoffs</p>

      {/* Desktop bracket */}
      <div className="bracket-desktop">
        <ConferenceBracket
          conference={eastern}
          expandedSeries={expandedSeries}
          onToggle={toggleExpand}
          onSelectTeam={onSelectTeam}
        />
        {finalRound && (
          <div className="bracket-final">
            <div className="bracket-round-label">{ROUND_LABELS[4]}</div>
            {(finalRound.series ?? []).map((s) => (
              <MatchupCard
                key={s.seriesLetter ?? s.seriesTitle ?? 'final'}
                series={s}
                expanded={expandedSeries === (s.seriesLetter ?? 'final')}
                onToggle={() => toggleExpand(s.seriesLetter ?? 'final')}
                onSelectTeam={onSelectTeam}
              />
            ))}
          </div>
        )}
        <ConferenceBracket
          conference={western}
          expandedSeries={expandedSeries}
          onToggle={toggleExpand}
          onSelectTeam={onSelectTeam}
          reverse
        />
      </div>

      {/* Mobile bracket */}
      <div className="bracket-mobile">
        <MobileBracket
          rounds={rounds}
          expandedSeries={expandedSeries}
          onToggle={toggleExpand}
          onSelectTeam={onSelectTeam}
        />
      </div>
    </section>
  )
}

function ConferenceBracket({ conference, expandedSeries, onToggle, onSelectTeam, reverse }) {
  const rounds = reverse ? [...conference.rounds].reverse() : conference.rounds

  return (
    <div className={`bracket-conference ${reverse ? 'bracket-conference--reverse' : ''}`}>
      <div className="bracket-conference__label">{conference.label}</div>
      <div className="bracket-conference__rounds">
        {rounds.map((round) => (
          <div key={round.roundNumber} className="bracket-round">
            <div className="bracket-round-label">{ROUND_LABELS[round.roundNumber]}</div>
            <div className="bracket-round__series">
              {round.series.map((s, i) => (
                <MatchupCard
                  key={s.seriesLetter ?? `${round.roundNumber}-${i}`}
                  series={s}
                  expanded={expandedSeries === (s.seriesLetter ?? `${round.roundNumber}-${i}`)}
                  onToggle={() => onToggle(s.seriesLetter ?? `${round.roundNumber}-${i}`)}
                  onSelectTeam={onSelectTeam}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MobileBracket({ rounds, expandedSeries, onToggle, onSelectTeam }) {
  // On mobile, show rounds as collapsible sections
  // Current/latest active round expanded by default
  const activeRound = [...rounds]
    .reverse()
    .find((r) =>
      (r.series ?? []).some(
        (s) => s.topSeedWins != null && s.bottomSeedWins != null &&
               s.topSeedWins < 4 && s.bottomSeedWins < 4
      )
    )

  const [openRound, setOpenRound] = useState(activeRound?.roundNumber ?? 1)

  return (
    <div className="bracket-mobile-rounds">
      {rounds.map((round) => {
        const roundNum = round.roundNumber ?? 0
        const series = round.series ?? []
        const isOpen = openRound === roundNum
        const completedCount = series.filter(
          (s) => s.topSeedWins === 4 || s.bottomSeedWins === 4
        ).length

        return (
          <div key={roundNum} className="bracket-mobile-round">
            <button
              className={`bracket-mobile-round__header ${isOpen ? 'bracket-mobile-round__header--open' : ''}`}
              onClick={() => setOpenRound(isOpen ? null : roundNum)}
            >
              <span>{ROUND_LABELS[roundNum] ?? `Round ${roundNum}`}</span>
              <span className="bracket-mobile-round__summary">
                {completedCount}/{series.length} complete
              </span>
              <span className="bracket-mobile-round__chevron">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <div className="bracket-mobile-round__series">
                {series.map((s, i) => (
                  <MatchupCard
                    key={s.seriesLetter ?? `${roundNum}-${i}`}
                    series={s}
                    expanded={expandedSeries === (s.seriesLetter ?? `${roundNum}-${i}`)}
                    onToggle={() => onToggle(s.seriesLetter ?? `${roundNum}-${i}`)}
                    onSelectTeam={onSelectTeam}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MatchupCard({ series, expanded, onToggle, onSelectTeam }) {
  const top = series.topSeedTeam ?? series.topSeed ?? {}
  const bottom = series.bottomSeedTeam ?? series.bottomSeed ?? {}
  const topWins = series.topSeedWins ?? 0
  const bottomWins = series.bottomSeedWins ?? 0
  const topAdvances = topWins === 4
  const bottomAdvances = bottomWins === 4
  const seriesComplete = topAdvances || bottomAdvances
  const topEliminated = bottomAdvances
  const bottomEliminated = topAdvances

  const topName = extractStr(top.name) || extractStr(top.commonName) || top.abbrev || 'TBD'
  const bottomName = extractStr(bottom.name) || extractStr(bottom.commonName) || bottom.abbrev || 'TBD'
  const topAbbrev = top.abbrev ?? ''
  const bottomAbbrev = bottom.abbrev ?? ''
  const topLogo = top.logo ?? top.darkLogo ?? ''
  const bottomLogo = bottom.logo ?? bottom.darkLogo ?? ''

  return (
    <div className={`matchup-card ${seriesComplete ? 'matchup-card--complete' : ''} ${!seriesComplete && topWins + bottomWins > 0 ? 'matchup-card--active' : ''}`}>
      <button className="matchup-card__main" onClick={onToggle}>
        {/* Top seed */}
        <div className={`matchup-team ${topAdvances ? 'matchup-team--winner' : ''} ${topEliminated ? 'matchup-team--eliminated' : ''}`}>
          {topLogo && (
            <img
              className="matchup-team__logo"
              src={topLogo}
              alt={topAbbrev}
              onClick={(e) => { e.stopPropagation(); if (topAbbrev) onSelectTeam(topAbbrev) }}
            />
          )}
          <span className="matchup-team__name">{topAbbrev || topName}</span>
          <span className="matchup-team__wins">{topWins}</span>
          {topAdvances && <span className="matchup-badge matchup-badge--advances">✓</span>}
          {topEliminated && <span className="matchup-badge matchup-badge--eliminated">✗</span>}
        </div>

        {/* Bottom seed */}
        <div className={`matchup-team ${bottomAdvances ? 'matchup-team--winner' : ''} ${bottomEliminated ? 'matchup-team--eliminated' : ''}`}>
          {bottomLogo && (
            <img
              className="matchup-team__logo"
              src={bottomLogo}
              alt={bottomAbbrev}
              onClick={(e) => { e.stopPropagation(); if (bottomAbbrev) onSelectTeam(bottomAbbrev) }}
            />
          )}
          <span className="matchup-team__name">{bottomAbbrev || bottomName}</span>
          <span className="matchup-team__wins">{bottomWins}</span>
          {bottomAdvances && <span className="matchup-badge matchup-badge--advances">✓</span>}
          {bottomEliminated && <span className="matchup-badge matchup-badge--eliminated">✗</span>}
        </div>
      </button>

      {/* Expanded game details */}
      {expanded && series.games && (
        <div className="matchup-card__games">
          {(series.games ?? []).map((g, i) => (
            <div key={i} className="matchup-game">
              <span className="matchup-game__label">Game {i + 1}</span>
              {g.gameState === 'FUT' || !g.homeTeam ? (
                <span className="matchup-game__tbd">
                  {g.gameDate ? new Date(g.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                </span>
              ) : (
                <span className="matchup-game__score">
                  {g.awayTeam?.abbrev} {g.awayTeam?.score ?? 0} — {g.homeTeam?.score ?? 0} {g.homeTeam?.abbrev}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PlayoffBracket/PlayoffBracket.jsx
git commit -m "feat: create PlayoffBracket component with matchup cards and mobile layout"
```

---

### Task 9: Create `PlayoffBracket` CSS

**Files:**
- Create: `src/components/PlayoffBracket/PlayoffBracket.css`

- [ ] **Step 1: Write bracket styles**

```css
/* src/components/PlayoffBracket/PlayoffBracket.css */

/* ── Section ─────────────────────────────── */
.bracket-section {
  width: 100%;
}

.bracket-error {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
  padding: var(--space-6);
}

/* ── Desktop bracket ─────────────────────── */
.bracket-desktop {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  overflow-x: auto;
  padding: var(--space-4) 0;
}

.bracket-conference {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  flex: 1;
}

.bracket-conference__label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-muted);
  letter-spacing: 1px;
  text-align: center;
}

.bracket-conference__rounds {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

.bracket-conference--reverse .bracket-conference__rounds {
  flex-direction: row-reverse;
}

.bracket-round {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.bracket-round-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  text-align: center;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-2);
}

.bracket-round__series {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.bracket-final {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  padding: 0 var(--space-4);
}

/* ── Matchup card ────────────────────────── */
.matchup-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  min-width: 160px;
  transition: border-color var(--transition-base), box-shadow var(--transition-base);
}

.matchup-card--active {
  border-color: var(--color-accent-dark);
  box-shadow: 0 0 12px var(--color-accent-glow);
}

.matchup-card--complete {
  opacity: 0.85;
}

.matchup-card__main {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.matchup-card__main:hover {
  background: var(--color-bg-hover);
}

/* ── Matchup team row ────────────────────── */
.matchup-team {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  transition: background var(--transition-fast);
}

.matchup-team + .matchup-team {
  border-top: 1px solid var(--color-border);
}

.matchup-team--winner {
  background: rgba(63, 185, 80, 0.08);
}

.matchup-team--eliminated {
  opacity: 0.45;
}

.matchup-team__logo {
  width: 24px;
  height: 24px;
  object-fit: contain;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.matchup-team__logo:hover {
  transform: scale(1.15);
}

.matchup-team__name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
}

.matchup-team__wins {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
  min-width: 16px;
  text-align: right;
}

.matchup-badge {
  font-size: var(--font-size-xs);
  font-weight: 700;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.matchup-badge--advances {
  background: rgba(63, 185, 80, 0.2);
  color: var(--color-assists);
}

.matchup-badge--eliminated {
  background: rgba(248, 81, 73, 0.15);
  color: var(--color-goals);
}

/* ── Expanded game details ───────────────── */
.matchup-card__games {
  border-top: 1px solid var(--color-border);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-elevated);
}

.matchup-game {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-1) 0;
  font-size: var(--font-size-xs);
}

.matchup-game__label {
  color: var(--color-text-muted);
  font-weight: 600;
}

.matchup-game__score {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.matchup-game__tbd {
  color: var(--color-text-muted);
  font-style: italic;
}

/* ── Mobile bracket ──────────────────────── */
.bracket-mobile {
  display: none;
}

.bracket-mobile-rounds {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.bracket-mobile-round__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.bracket-mobile-round__header--open {
  border-color: var(--color-accent-dark);
  background: var(--color-bg-elevated);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.bracket-mobile-round__summary {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-weight: 500;
}

.bracket-mobile-round__chevron {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.bracket-mobile-round__series {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
}

.bracket-mobile-round__series .matchup-card {
  min-width: unset;
  width: 100%;
}

/* ── Responsive ──────────────────────────── */
@media (max-width: 768px) {
  .bracket-desktop {
    display: none;
  }

  .bracket-mobile {
    display: block;
  }
}

@media (min-width: 769px) and (max-width: 1023px) {
  .matchup-card {
    min-width: 130px;
  }

  .matchup-team__logo {
    width: 20px;
    height: 20px;
  }

  .matchup-team__name {
    font-size: var(--font-size-xs);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PlayoffBracket/PlayoffBracket.css
git commit -m "feat: add PlayoffBracket responsive CSS — desktop, tablet, and mobile layouts"
```

---

### Task 10: Update `LeagueLeaders` to Accept `gameType` Prop

**Files:**
- Modify: `src/components/LeagueLeaders/LeagueLeaders.jsx`

- [ ] **Step 1: Add `gameType` prop and pass to hooks**

Update the component signature and hook calls. In `src/components/LeagueLeaders/LeagueLeaders.jsx`:

Change line 26 from:
```jsx
export function LeagueLeaders({ onSelectPlayer, onSelectTeam }) {
```
to:
```jsx
export function LeagueLeaders({ onSelectPlayer, onSelectTeam, gameType = 2 }) {
```

Change lines 31-32 from:
```jsx
  const { data: skaterData, loading: skaterLoading } = useSkaterLeaders(10)
  const { data: goalieData, loading: goalieLoading } = useGoalieLeaders(10)
```
to:
```jsx
  const { data: skaterData, loading: skaterLoading } = useSkaterLeaders(10, gameType)
  const { data: goalieData, loading: goalieLoading } = useGoalieLeaders(10, gameType)
```

Change lines 49-52 from:
```jsx
      <h2 className="section-title">
        <span className="section-title__icon">🏆</span> League Leaders
      </h2>
      <p className="section-subtitle">Top performers across the NHL this season</p>
```
to:
```jsx
      <h2 className="section-title">
        <span className="section-title__icon">🏆</span> {gameType === 3 ? 'Playoff' : 'League'} Leaders
      </h2>
      <p className="section-subtitle">
        {gameType === 3 ? 'Top performers in the 2026 playoffs' : 'Top performers across the NHL this season'}
      </p>
```

- [ ] **Step 2: Verify — League Leaders still works with default gameType**

Run: `npm run dev`

Confirm the Leaders section loads on the home page.

- [ ] **Step 3: Commit**

```bash
git add src/components/LeagueLeaders/LeagueLeaders.jsx
git commit -m "feat: add gameType prop to LeagueLeaders for playoff stats"
```

---

### Task 11: Update `Scoreboard` for Playoff Series Context

**Files:**
- Modify: `src/components/Scoreboard/Scoreboard.jsx`

- [ ] **Step 1: Add `gameType` prop and series context display**

Update the component signature at line 35:

```jsx
export function Scoreboard({ gameType = 2 }) {
```

Add a filter in the `displayGames` logic. After line 55, update:

```jsx
  // For today, use the polled score data; for other days use schedule data
  const allDisplayGames = selectedDate === currentDate ? todayGames : (selectedTab?.games ?? [])

  // Filter by gameType if in playoff mode
  const displayGames = gameType === 3
    ? allDisplayGames.filter((g) => g.gameType === 3 || g.gameType == null)
    : allDisplayGames
```

Update the section title and subtitle (lines 65-73):

```jsx
      <h2 className="section-title">
        <span className="section-title__icon">📺</span> {gameType === 3 ? 'Playoff Games' : 'Games & Scores'}
      </h2>
      <p className="section-subtitle">
        {gameType === 3
          ? 'Playoff matchups with series context'
          : 'Live scores, today\'s results, and upcoming schedule'}
        {selectedDate === currentDate && (
          <span className="scoreboard-live-dot" title="Auto-refreshing every 60s" />
        )}
      </p>
```

Update the `GameCard` component (line 132) to show series context:

```jsx
function GameCard({ game }) {
  const live = isLive(game.gameState)
  const final = isFinal(game.gameState)
  const hasScore = game.awayTeam.score != null && game.homeTeam.score != null

  const awayWins = hasScore && final && game.awayTeam.score > game.homeTeam.score
  const homeWins = hasScore && final && game.homeTeam.score > game.awayTeam.score

  // Series context for playoff games
  const seriesLabel = game.seriesStatus
    ? typeof game.seriesStatus === 'string'
      ? game.seriesStatus
      : game.seriesStatus.seriesStatusShort ?? null
    : null

  return (
    <div className={`game-card ${live ? 'game-card--live' : ''}`}>
      {/* Series context */}
      {seriesLabel && (
        <div className="game-card__series">{seriesLabel}</div>
      )}

      {/* Status badge */}
      <div className="game-card__status">
        {live && (
          <>
            <span className="scoreboard-live-indicator" />
            <span className="game-card__period">
              P{game.period} {game.clock}
              {game.inIntermission ? ' INT' : ''}
            </span>
          </>
        )}
        {final && <span className="game-card__final">Final{game.periodType === 'OT' ? ' (OT)' : game.periodType === 'SO' ? ' (SO)' : ''}</span>}
        {!live && !final && (
          <span className="game-card__time">{formatTime(game.startTimeUTC)}</span>
        )}
      </div>

      {/* Away team */}
      <div className={`game-card__team ${awayWins ? 'game-card__team--winner' : ''}`}>
        <img className="game-card__logo" src={game.awayTeam.logo} alt={game.awayTeam.abbrev} />
        <span className="game-card__abbrev">{game.awayTeam.abbrev}</span>
        {hasScore && <span className="game-card__score">{game.awayTeam.score}</span>}
      </div>

      {/* Home team */}
      <div className={`game-card__team ${homeWins ? 'game-card__team--winner' : ''}`}>
        <img className="game-card__logo" src={game.homeTeam.logo} alt={game.homeTeam.abbrev} />
        <span className="game-card__abbrev">{game.homeTeam.abbrev}</span>
        {hasScore && <span className="game-card__score">{game.homeTeam.score}</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add series context CSS**

Append to `src/components/Scoreboard/Scoreboard.css`:

```css
/* ── Playoff series context ─────────────── */
.game-card__series {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-accent);
  text-align: center;
  padding: var(--space-1) var(--space-2);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-accent-glow);
}
```

- [ ] **Step 3: Verify scoreboard still works for regular season games**

Run: `npm run dev`

Confirm scoreboard renders.

- [ ] **Step 4: Commit**

```bash
git add src/components/Scoreboard/Scoreboard.jsx src/components/Scoreboard/Scoreboard.css
git commit -m "feat: add gameType prop and series context to Scoreboard"
```

---

### Task 12: Update `TrendingPlayers` to Accept `gameType` Prop

**Files:**
- Modify: `src/components/TrendingPlayers/TrendingPlayers.jsx`

- [ ] **Step 1: Add `gameType` prop and update fetch URL**

Change line 11 from:
```jsx
export function TrendingPlayers({ onSelectPlayer }) {
```
to:
```jsx
export function TrendingPlayers({ onSelectPlayer, gameType = 2 }) {
```

Change the fetch URL on line 19 from:
```jsx
    fetch('/nhl-api/v1/skater-stats-leaders/20252026/2?categories=points&limit=20')
```
to:
```jsx
    fetch(`/nhl-api/v1/skater-stats-leaders/20252026/${gameType}?categories=points&limit=20`)
```

Add `gameType` to the useEffect dependency array. Change line 66 from:
```jsx
  }, [])
```
to:
```jsx
  }, [gameType])
```

Update the section title and subtitle (lines 81-84):
```jsx
      <h2 className="section-title">
        <span className="section-title__icon">🔥</span> {gameType === 3 ? 'Playoff Hot Streaks' : 'Trending Players'}
      </h2>
      <p className="section-subtitle">
        {gameType === 3 ? 'Hottest performers in the playoffs' : 'Hottest performers over their last 5 games'}
      </p>
```

- [ ] **Step 2: Verify it still works**

Run: `npm run dev`

Confirm Trending Players loads.

- [ ] **Step 3: Commit**

```bash
git add src/components/TrendingPlayers/TrendingPlayers.jsx
git commit -m "feat: add gameType prop to TrendingPlayers for playoff hot streaks"
```

---

### Task 13: Update `StatsTable` and `GameLogChart` for Playoff Support

**Files:**
- Modify: `src/components/StatsTable/StatsTable.jsx`
- Modify: `src/components/GameLogChart/GameLogChart.jsx`

- [ ] **Step 1: Add `gameType` prop to `StatsTable`**

In `src/components/StatsTable/StatsTable.jsx`, add import and update component:

Change line 1-2 from:
```jsx
import './StatsTable.css'
import { getTableSeasons } from '../../utils/statsHelpers'
```
to:
```jsx
import './StatsTable.css'
import { getTableSeasons, getPlayoffTableSeasons } from '../../utils/statsHelpers'
```

Change line 6 from:
```jsx
export function StatsTable({ playerData, loading }) {
```
to:
```jsx
export function StatsTable({ playerData, loading, gameType = 2 }) {
```

Change lines 18-19 from:
```jsx
  const currentSeason = playerData.featuredStats?.season ?? null
  const rows = getTableSeasons(playerData.seasonTotals, currentSeason)
```
to:
```jsx
  const currentSeason = playerData.featuredStats?.season ?? null
  const rows = gameType === 3
    ? getPlayoffTableSeasons(playerData.seasonTotals, currentSeason)
    : getTableSeasons(playerData.seasonTotals, currentSeason)
```

Change line 11 (the card title in loading state) and line 22 (the card title in empty state) and line 32 (the main card title):
```jsx
// In the loading block:
        <h2 className="card-title">{gameType === 3 ? 'Playoff Career Stats' : 'Career Stats'}</h2>

// In the empty block:
        <h2 className="card-title">{gameType === 3 ? 'Playoff Career Stats' : 'Career Stats'}</h2>
        <p className="stats-table-empty">
          {gameType === 3 ? 'No NHL playoff data available.' : 'No NHL regular season data available.'}
        </p>

// In the main render:
      <h2 className="card-title">{gameType === 3 ? 'Playoff Career Stats' : 'Career Stats'}</h2>
```

- [ ] **Step 2: Add `gameCount` prop to `GameLogChart`**

In `src/components/GameLogChart/GameLogChart.jsx`, change line 16 from:
```jsx
export function GameLogChart({ gameLog, loading, error, onRetry }) {
```
to:
```jsx
export function GameLogChart({ gameLog, loading, error, onRetry, gameCount = 20 }) {
```

Change line 37 from:
```jsx
  const data = prepareGameLog(gameLog, 20)
```
to:
```jsx
  const data = prepareGameLog(gameLog, gameCount)
```

Update the title on line 53-55:
```jsx
        <h2 className="card-title" style={{ marginBottom: 0 }}>
          Game Log
          <span className="game-log-subtitle"> — {gameCount ? `Last ${data.length}` : `All ${data.length}`} Games</span>
        </h2>
```

- [ ] **Step 3: Verify player dashboard still works**

Run: `npm run dev`

Click into a player, confirm chart and table render.

- [ ] **Step 4: Commit**

```bash
git add src/components/StatsTable/StatsTable.jsx src/components/GameLogChart/GameLogChart.jsx
git commit -m "feat: add gameType prop to StatsTable and gameCount to GameLogChart"
```

---

### Task 14: Update `App.jsx` — State, Navigation, Toggle, and Layout

**Files:**
- Modify: `src/App.jsx`

This is the central integration task. All previously modified components get wired together here.

- [ ] **Step 1: Add imports for new components and hooks**

Add to the imports at the top of `src/App.jsx` (after line 13):

```jsx
import { PlayoffBracket } from './components/PlayoffBracket/PlayoffBracket'
import { PlayoffBanner } from './components/PlayoffBanner/PlayoffBanner'
import { SeasonToggle } from './components/SeasonToggle/SeasonToggle'
import { usePlayoffBracket } from './hooks/usePlayoffBracket'
```

- [ ] **Step 2: Add new state variables**

After line 41 (`const [compareOpen, setCompareOpen] = useState(false)`), add:

```jsx
  const [seasonFilter, setSeasonFilter] = useState('playoffs')
  const [playerTab, setPlayerTab] = useState('regular')
  const [navigationSource, setNavigationSource] = useState({ from: 'home' })

  // Playoff bracket data
  const { bracketData, loading: bracketLoading, error: bracketError } = usePlayoffBracket()

  // Auto-detect playoff mode: check if bracket data has any series
  const playoffMode = !!bracketData

  // Derive the gameType from seasonFilter
  const gameType = playoffMode && seasonFilter === 'playoffs' ? 3 : 2
```

- [ ] **Step 3: Add playoff game log hook call**

After the existing `useGameLog(primaryId)` call (line 55), add:

```jsx
  const {
    gameLog: playoffGameLog,
    loading: playoffGameLogLoading,
    error: playoffGameLogError,
    retry: playoffGameLogRetry,
  } = useGameLog(primaryId, 3)
```

- [ ] **Step 4: Update navigation handlers**

Replace the existing handlers (lines 60-73) with:

```jsx
  const handleSelectPlayer = (id, source) => {
    setSelectedTeam(null)
    setPrimaryId(id)
    setPlayerTab('regular')
    setNavigationSource(source ?? { from: 'home' })
  }

  const handleSelectTeam = (abbrev) => {
    setPrimaryId(null)
    setSelectedTeam(abbrev)
  }

  const handleBackHome = () => {
    setPrimaryId(null)
    setSelectedTeam(null)
    setNavigationSource({ from: 'home' })
  }

  const handleBackFromPlayer = () => {
    if (navigationSource.from === 'team' && navigationSource.teamAbbrev) {
      setPrimaryId(null)
      setSelectedTeam(navigationSource.teamAbbrev)
    } else {
      handleBackHome()
    }
    setNavigationSource({ from: 'home' })
  }
```

- [ ] **Step 5: Update the home page layout**

Replace the home page section (lines 102-158) with:

```jsx
      {/* ── Home page ──────────────────────────────────────── */}
      {!hasPlayer && !hasTeam && (
        <div className="home-page">
          {/* Playoff Banner */}
          {playoffMode && (
            <div className="home-section">
              <PlayoffBanner bracketData={bracketData} />
            </div>
          )}

          {/* Playoff Bracket */}
          {playoffMode && (
            <div className="home-section">
              <PlayoffBracket
                bracketData={bracketData}
                loading={bracketLoading}
                error={bracketError}
                onSelectTeam={handleSelectTeam}
              />
            </div>
          )}

          {/* Popular Players */}
          <div className="home-section home-section--popular">
            <p className="popular-heading">Popular Players</p>
            <div className="popular-grid">
              {POPULAR_PLAYERS.map((p, i) => (
                <button
                  key={p.id}
                  className="popular-card"
                  style={{ animationDelay: `${i * 0.2}s` }}
                  onClick={() => handleSelectPlayer(p.id)}
                >
                  <div className="popular-card__logo-wrap">
                    <img
                      className="popular-card__team-logo"
                      src={getTeamLogoUrl(p.team)}
                      alt={p.team}
                      loading="lazy"
                    />
                  </div>
                  <div className="popular-card__info">
                    <span className="popular-card__name">{p.name}</span>
                    <span className="popular-card__meta">
                      {p.team} &middot; {p.pos}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Season Toggle */}
          {playoffMode && (
            <div className="home-section home-section--toggle">
              <SeasonToggle value={seasonFilter} onChange={setSeasonFilter} />
            </div>
          )}

          {/* Scoreboard */}
          <div className="home-section">
            <Scoreboard gameType={gameType} />
          </div>

          {/* Trending Players */}
          <div className="home-section">
            <TrendingPlayers onSelectPlayer={handleSelectPlayer} gameType={gameType} />
          </div>

          {/* League Leaders */}
          <div className="home-section">
            <LeagueLeaders
              onSelectPlayer={handleSelectPlayer}
              onSelectTeam={handleSelectTeam}
              gameType={gameType}
            />
          </div>

          {/* Browse by Team */}
          <div className="home-section">
            <TeamsBrowser onSelectTeam={handleSelectTeam} />
          </div>
        </div>
      )}
```

- [ ] **Step 6: Update Team Page with navigation source**

Replace the Team Page section (lines 161-167) with:

```jsx
      {/* ── Team page ────────────────────────────────────────── */}
      {hasTeam && !hasPlayer && (
        <TeamPage
          teamAbbrev={selectedTeam}
          onBack={handleBackHome}
          onSelectPlayer={(id) => handleSelectPlayer(id, { from: 'team', teamAbbrev: selectedTeam })}
        />
      )}
```

- [ ] **Step 7: Update Player Dashboard with playoff tab and context-aware back button**

Replace the Player Dashboard section (lines 170-208) with:

```jsx
      {/* ── Player Dashboard ─────────────────────────────────── */}
      {hasPlayer && (
        <>
          <div className="player-actions">
            <button className="back-button" onClick={handleBackFromPlayer}>
              &larr; {navigationSource.from === 'team'
                ? `Back to ${navigationSource.teamAbbrev}`
                : 'Back to Home'}
            </button>
            <CompareButton onClick={() => setCompareOpen(true)} />
          </div>

          <PlayerHeader
            data={playerData}
            loading={playerLoading}
            error={playerError}
            onRetry={playerRetry}
          />

          {/* Player tab bar */}
          <div className="player-tab-bar">
            <button
              className={`player-tab ${playerTab === 'regular' ? 'player-tab--active' : ''}`}
              onClick={() => setPlayerTab('regular')}
            >
              Regular Season
            </button>
            <button
              className={`player-tab ${playerTab === 'playoffs' ? 'player-tab--active' : ''}`}
              onClick={() => setPlayerTab('playoffs')}
            >
              Playoffs
            </button>
          </div>

          {playerTab === 'regular' ? (
            <div className="dashboard-grid">
              <div className="charts-row">
                <CareerChart
                  playerData={playerData}
                  loading={playerLoading}
                />
                <GameLogChart
                  gameLog={gameLog}
                  loading={gameLogLoading}
                  error={gameLogError}
                  onRetry={gameLogRetry}
                />
              </div>
              <StatsTable playerData={playerData} loading={playerLoading} />
            </div>
          ) : (
            <div className="dashboard-grid">
              <div className="charts-row">
                <GameLogChart
                  gameLog={playoffGameLog}
                  loading={playoffGameLogLoading}
                  error={playoffGameLogError}
                  onRetry={playoffGameLogRetry}
                  gameCount={null}
                />
              </div>
              <StatsTable playerData={playerData} loading={playerLoading} gameType={3} />
            </div>
          )}

          <PlayerComparisonPanel
            primaryData={playerData}
            isOpen={compareOpen}
            onClose={() => setCompareOpen(false)}
          />
        </>
      )}
```

- [ ] **Step 8: Verify the full app loads**

Run: `npm run dev`

Test:
1. Home page loads (bracket may error if API not available yet — that's fine)
2. Click a player from popular players — player dashboard loads with tab bar
3. Click "Regular Season" and "Playoffs" tabs — content swaps
4. Back button works
5. Click a team → click a player → back button says "Back to [TEAM]"

- [ ] **Step 9: Commit**

```bash
git add src/App.jsx
git commit -m "feat: integrate playoff mode into App — bracket, toggle, tabs, context-aware navigation"
```

---

### Task 15: Add Player Tab Bar and Toggle Area Styles to `App.css`

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Add player tab bar and toggle area styles**

Append to `src/App.css`:

```css
/* ── Season toggle area ────────────────────────────────── */
.home-section--toggle {
  display: flex;
  justify-content: center;
}

/* ── Player tab bar ────────────────────────────────────── */
.player-tab-bar {
  display: flex;
  gap: var(--space-1);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-1);
  margin-top: var(--space-4);
  margin-bottom: var(--space-2);
  width: fit-content;
}

.player-tab {
  padding: var(--space-2) var(--space-5);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition: color var(--transition-fast), background var(--transition-fast);
}

.player-tab:hover {
  color: var(--color-text-primary);
}

.player-tab--active {
  background: var(--color-accent-dark);
  color: var(--color-text-primary);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

@media (max-width: 640px) {
  .player-tab-bar {
    width: 100%;
  }

  .player-tab {
    flex: 1;
    text-align: center;
  }
}
```

- [ ] **Step 2: Verify styles render correctly**

Run: `npm run dev`

Navigate to a player, confirm tab bar is styled correctly on both desktop and mobile viewport sizes.

- [ ] **Step 3: Commit**

```bash
git add src/App.css
git commit -m "feat: add player tab bar and season toggle area styles"
```

---

### Task 16: Verify End-to-End and Final Polish

**Files:**
- All modified files

- [ ] **Step 1: Test the full home page flow**

Run: `npm run dev`

Check each home page section:
1. Playoff Banner renders (or countdown if pre-playoffs)
2. Bracket renders (may show TBD/error before playoffs start — verify graceful handling)
3. Season Toggle is visible and works
4. Toggling to "Playoffs" changes Leaders, Scoreboard, Trending titles and data sources
5. Toggling back to "Regular Season" restores original data

- [ ] **Step 2: Test player navigation flow**

1. Click popular player → player dashboard with "Regular Season" / "Playoffs" tabs
2. Switch to Playoffs tab — see playoff game log and playoff career stats (or empty state)
3. Click back → returns to home
4. Click team → click player from roster → back button says "Back to [TEAM]"
5. Click back → returns to team page (not home)

- [ ] **Step 3: Test responsive design**

Open Chrome DevTools, toggle device toolbar:
1. **Desktop (1280px)**: horizontal bracket, side-by-side charts, inline toggle
2. **Tablet (768px)**: compressed bracket, stacked charts
3. **Mobile (375px)**: vertical bracket with collapsible rounds, full-width toggle/tabs, stacked cards

- [ ] **Step 4: Verify no console errors**

Check browser console — no React warnings, no failed fetches (aside from bracket endpoint if playoffs haven't started).

- [ ] **Step 5: Run production build**

```bash
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 6: Commit any polish fixes**

If any fixes were needed:

```bash
git add -A
git commit -m "fix: polish playoff section — responsive tweaks and edge cases"
```
