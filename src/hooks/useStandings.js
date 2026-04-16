import { useState, useEffect } from 'react'
import { extractStr } from '../utils/formatters'

/** Get today's date as YYYY-MM-DD in local timezone */
function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Fetch current NHL standings.
 * @returns {{ teams: array, loading: boolean, error: string|null }}
 */
export function useStandings() {
  const [state, setState] = useState({ teams: [], loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    fetch(`/nhl-api/v1/standings/${getTodayStr()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
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
