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
export function PlayoffBanner({ bracketData, isProjected }) {
  const [now, setNow] = useState(() => new Date())

  // Update the countdown every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  if (!bracketData) {
    return (
      <div className="playoff-banner playoff-banner--countdown">
        <span className="playoff-banner__icon">🏒</span>
        <span className="playoff-banner__text">
          2026 Stanley Cup Playoffs — Coming Soon
        </span>
      </div>
    )
  }

  if (isProjected) {
    return (
      <div className="playoff-banner playoff-banner--projected">
        <span className="playoff-banner__icon">🏒</span>
        <span className="playoff-banner__text">
          2026 Stanley Cup Playoffs — Projected Bracket Based on Current Standings
        </span>
      </div>
    )
  }

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
  return (
    <div className="playoff-banner playoff-banner--active">
      <span className="playoff-banner__icon">🏒</span>
      <span className="playoff-banner__text">
        2026 Stanley Cup Playoffs — {ROUND_LABELS[currentRound] ?? `Round ${currentRound}`}
      </span>
      <span className="playoff-banner__live-dot" />
    </div>
  )
}

// Static lookup — hoisted to module level to avoid recreation on every render
const ROUND_LABELS = {
  1: 'First Round',
  2: 'Second Round',
  3: 'Conference Finals',
  4: 'Stanley Cup Final',
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
