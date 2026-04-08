import { useState, useEffect } from 'react'
import { extractStr } from '../utils/formatters'

const ROSTER_CACHE = new Map()
const STATS_CACHE = new Map()

/**
 * Fetch roster for a team.
 * @param {string|null} teamAbbrev
 * @returns {{ roster: object|null, loading: boolean, error: string|null }}
 */
export function useTeamRoster(teamAbbrev) {
  const [state, setState] = useState({ roster: null, loading: false, error: null })

  useEffect(() => {
    if (!teamAbbrev) {
      setState({ roster: null, loading: false, error: null })
      return
    }

    if (ROSTER_CACHE.has(teamAbbrev)) {
      setState({ roster: ROSTER_CACHE.get(teamAbbrev), loading: false, error: null })
      return
    }

    let cancelled = false
    setState({ roster: null, loading: true, error: null })

    fetch(`/nhl-api/v1/roster/${teamAbbrev}/current`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        const roster = {
          forwards: (data.forwards ?? []).map(mapRosterPlayer),
          defensemen: (data.defensemen ?? []).map(mapRosterPlayer),
          goalies: (data.goalies ?? []).map(mapRosterPlayer),
        }
        ROSTER_CACHE.set(teamAbbrev, roster)
        setState({ roster, loading: false, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        setState({ roster: null, loading: false, error: err.message })
      })

    return () => { cancelled = true }
  }, [teamAbbrev])

  return state
}

/**
 * Fetch club stats for a team.
 * @param {string|null} teamAbbrev
 * @returns {{ stats: object|null, loading: boolean, error: string|null }}
 */
export function useTeamStats(teamAbbrev) {
  const [state, setState] = useState({ stats: null, loading: false, error: null })

  useEffect(() => {
    if (!teamAbbrev) {
      setState({ stats: null, loading: false, error: null })
      return
    }

    if (STATS_CACHE.has(teamAbbrev)) {
      setState({ stats: STATS_CACHE.get(teamAbbrev), loading: false, error: null })
      return
    }

    let cancelled = false
    setState({ stats: null, loading: true, error: null })

    fetch(`/nhl-api/v1/club-stats/${teamAbbrev}/now`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        const stats = {
          skaters: (data.skaters ?? []).map(mapSkaterStats),
          goalies: (data.goalies ?? []).map(mapGoalieStats),
        }
        STATS_CACHE.set(teamAbbrev, stats)
        setState({ stats, loading: false, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        setState({ stats: null, loading: false, error: err.message })
      })

    return () => { cancelled = true }
  }, [teamAbbrev])

  return state
}

function mapRosterPlayer(p) {
  return {
    id: p.id,
    firstName: extractStr(p.firstName),
    lastName: extractStr(p.lastName),
    name: `${extractStr(p.firstName)} ${extractStr(p.lastName)}`.trim(),
    headshot: p.headshot ?? null,
    sweaterNumber: p.sweaterNumber ?? '',
    positionCode: p.positionCode ?? '',
    heightInInches: p.heightInInches,
    weightInPounds: p.weightInPounds,
    birthDate: p.birthDate ?? '',
    birthCity: extractStr(p.birthCity),
    birthCountry: p.birthCountry ?? '',
    shootsCatches: p.shootsCatches ?? '',
  }
}

function mapSkaterStats(s) {
  return {
    playerId: s.playerId,
    name: `${extractStr(s.firstName)} ${extractStr(s.lastName)}`.trim(),
    headshot: s.headshot ?? null,
    positionCode: s.positionCode ?? '',
    gamesPlayed: s.gamesPlayed ?? 0,
    goals: s.goals ?? 0,
    assists: s.assists ?? 0,
    points: s.points ?? 0,
    plusMinus: s.plusMinus ?? 0,
    pim: s.penaltyMinutes ?? 0,
    ppGoals: s.powerPlayGoals ?? 0,
    shots: s.shots ?? 0,
    avgToi: s.avgTimeOnIcePerGame ?? 0,
    shootingPctg: s.shootingPctg ?? 0,
  }
}

function mapGoalieStats(g) {
  return {
    playerId: g.playerId,
    name: `${extractStr(g.firstName)} ${extractStr(g.lastName)}`.trim(),
    headshot: g.headshot ?? null,
    gamesPlayed: g.gamesPlayed ?? 0,
    wins: g.wins ?? 0,
    losses: g.losses ?? 0,
    otLosses: g.overtimeLosses ?? 0,
    gaa: g.goalsAgainstAverage ?? 0,
    savePctg: g.savePercentage ?? 0,
    shutouts: g.shutouts ?? 0,
  }
}
