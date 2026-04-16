import { useState, useEffect } from 'react'
import './TrendingPlayers.css'
import { extractStr } from '../../utils/formatters'
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner'

/**
 * Displays trending / hot players based on points in last 5 games.
 * Uses the player landing API's last5Games data via the skater leaders endpoint,
 * then fetches each top player's last5Games to rank by recent production.
 */
export function TrendingPlayers({ onSelectPlayer, gameType = 2 }) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    // Fetch top points leaders, then get their last5Games from landing data
    fetch(`/nhl-api/v1/skater-stats-leaders/20252026/${gameType}?categories=points&limit=20`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        const leaders = data.points ?? []
        // Fetch last5Games for top 12 players
        const top = leaders.slice(0, 12)
        return Promise.all(
          top.map((p) =>
            fetch(`/nhl-api/v1/player/${p.id}/landing`)
              .then((r) => r.json())
              .then((d) => ({
                id: p.id,
                name: `${extractStr(p.firstName)} ${extractStr(p.lastName)}`.trim(),
                headshot: p.headshot ?? null,
                teamAbbrev: p.teamAbbrev ?? '',
                teamLogo: p.teamLogo ?? null,
                position: p.position ?? '',
                last5: d.last5Games ?? [],
              }))
              .catch(() => null)
          )
        )
      })
      .then((results) => {
        if (cancelled) return
        const hot = (results ?? [])
          .filter(Boolean)
          .map((p) => {
            const pts = p.last5.reduce((sum, g) => sum + (g.points ?? 0), 0)
            const goals = p.last5.reduce((sum, g) => sum + (g.goals ?? 0), 0)
            const assists = p.last5.reduce((sum, g) => sum + (g.assists ?? 0), 0)
            return { ...p, recentPoints: pts, recentGoals: goals, recentAssists: assists }
          })
          .sort((a, b) => b.recentPoints - a.recentPoints)
          .slice(0, 8)
        setPlayers(hot)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [gameType])

  if (loading) {
    return (
      <section className="trending-section">
        <h2 className="section-title">{gameType === 3 ? 'Playoff Hot Streaks' : 'Trending Players'}</h2>
        <LoadingSpinner label="Loading trending players..." />
      </section>
    )
  }

  if (players.length === 0) return null

  return (
    <section className="trending-section">
      <h2 className="section-title">
        <span className="section-title__icon">🔥</span> {gameType === 3 ? 'Playoff Hot Streaks' : 'Trending Players'}
      </h2>
      <p className="section-subtitle">
        {gameType === 3 ? 'Hottest performers in the playoffs' : 'Hottest performers over their last 5 games'}
      </p>
      <div className="trending-grid">
        {players.map((p, i) => (
          <button
            key={p.id}
            className="trending-card"
            onClick={() => onSelectPlayer(p.id)}
          >
            <img
              className="trending-card__headshot"
              src={p.headshot}
              alt={p.name}
              onError={(e) => {
                e.currentTarget.src = p.teamLogo || ''
                e.currentTarget.classList.add('trending-card__headshot--logo')
              }}
            />
            <div className="trending-card__info">
              <span className="trending-card__name">{p.name}</span>
              <span className="trending-card__team">{p.teamAbbrev} &middot; {p.position}</span>
            </div>
            <div className="trending-card__stats">
              <span className="trending-stat trending-stat--pts">{p.recentPoints} PTS</span>
              <span className="trending-stat trending-stat--detail">
                {p.recentGoals}G {p.recentAssists}A
              </span>
              <span className="trending-stat trending-stat--label">Last 5 GP</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
