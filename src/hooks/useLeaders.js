import { useState, useEffect } from 'react'
import { extractStr } from '../utils/formatters'

const CURRENT_SEASON = '20252026'

/**
 * Fetch skater stat leaders (goals, assists, points).
 * @param {number} limit
 * @param {number} gameType
 * @returns {{ data: object|null, loading: boolean, error: string|null }}
 */
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

/**
 * Fetch goalie stat leaders (savePctg, goalsAgainstAverage, shutouts).
 * @param {number} limit
 * @param {number} gameType
 * @returns {{ data: object|null, loading: boolean, error: string|null }}
 */
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

function mapLeader(p) {
  return {
    id: p.id,
    name: `${extractStr(p.firstName)} ${extractStr(p.lastName)}`.trim(),
    headshot: p.headshot ?? null,
    teamAbbrev: p.teamAbbrev ?? '',
    teamLogo: p.teamLogo ?? null,
    position: p.position ?? '',
    sweaterNumber: p.sweaterNumber,
    value: p.value,
  }
}
