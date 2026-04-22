import { useState, useEffect } from 'react'
import { extractStr } from '../utils/formatters'

/** YYYY-MM-DD for a date N days before today, local time. */
function dateDaysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Fetch standings, walking backward until a non-empty response is found.
 *
 * Why: the date-specific endpoint `/standings/{date}` returns an empty array
 * for any day during the playoffs, and the `/standings/now` endpoint 307-
 * redirects cross-origin which the browser can't follow through Vercel's
 * rewrites (works in Vite dev only because the proxy follows redirects).
 * Trying a handful of progressively older offsets is robust across regular
 * season (today returns data) and any point in the playoffs.
 */
async function fetchStandingsWithFallback() {
  const offsets = [0, 1, 3, 7, 14, 21, 30, 45, 60]
  for (const n of offsets) {
    const date = dateDaysAgo(n)
    try {
      const r = await fetch(`/nhl-api/v1/standings/${date}`)
      if (!r.ok) continue
      const data = await r.json()
      if (Array.isArray(data.standings) && data.standings.length > 0) {
        return data
      }
    } catch {
      // try the next offset
    }
  }
  return null
}

/**
 * Fetch current NHL standings.
 * @returns {{ teams: array, loading: boolean, error: string|null }}
 */
export function useStandings() {
  const [state, setState] = useState({ teams: [], loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    fetchStandingsWithFallback()
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setState({ teams: [], loading: false, error: 'Standings unavailable' })
          return
        }
        const teams = (data.standings ?? []).map((t) => ({
          teamAbbrev: extractStr(t.teamAbbrev) || '',
          teamName: extractStr(t.teamName),
          teamCommonName: extractStr(t.teamCommonName),
          teamLogo: t.teamLogo ?? '',
          conference: extractStr(t.conferenceAbbrev) || '',
          division: extractStr(t.divisionAbbrev) || '',
          divisionSequence: t.divisionSequence ?? 0,
          conferenceSequence: t.conferenceSequence ?? 0,
          wildcardSequence: t.wildcardSequence ?? 0,
          clinchIndicator: t.clinchIndicator ?? '',
          gamesPlayed: t.gamesPlayed ?? 0,
          wins: t.wins ?? 0,
          losses: t.losses ?? 0,
          otLosses: t.otLosses ?? 0,
          points: t.points ?? 0,
          goalFor: t.goalFor ?? 0,
          goalAgainst: t.goalAgainst ?? 0,
          goalDifferential: t.goalDifferential ?? 0,
          streakCode: t.streakCode ?? '',
          streakCount: t.streakCount ?? 0,
        }))
        setState({ teams, loading: false, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        setState({ teams: [], loading: false, error: err.message })
      })

    return () => { cancelled = true }
  }, [])

  return state
}
