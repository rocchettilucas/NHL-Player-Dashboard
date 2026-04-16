import { useState, useEffect, useRef } from 'react'
import { extractStr } from '../utils/formatters'

const POLL_INTERVAL = 60_000 // 60 seconds

/** Get today's date as YYYY-MM-DD in local timezone */
function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Fetch current scores / schedule with periodic polling for live updates.
 * @returns {{ games: array, currentDate: string, loading: boolean, error: string|null }}
 */
export function useScores() {
  const [state, setState] = useState({ games: [], currentDate: '', loading: true, error: null })
  const intervalRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const fetchScores = () => {
      const today = getTodayStr()
      fetch(`/nhl-api/v1/score/${today}`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((data) => {
          if (cancelled) return
          const raw = data.games ?? []
          const games = raw.map((g) => {
            try { return mapGame(g) }
            catch { return null }
          }).filter(Boolean)
          setState({ games, currentDate: data.currentDate ?? '', loading: false, error: null })
        })
        .catch((err) => {
          if (cancelled) return
          setState((prev) => ({ ...prev, loading: false, error: err.message }))
        })
    }

    fetchScores()
    intervalRef.current = setInterval(fetchScores, POLL_INTERVAL)

    return () => {
      cancelled = true
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return state
}

/**
 * Fetch the weekly schedule (multiple days of games).
 * @returns {{ days: array, loading: boolean, error: string|null }}
 */
export function useSchedule() {
  const [state, setState] = useState({ days: [], loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    fetch(`/nhl-api/v1/schedule/${getTodayStr()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        const days = (data.gameWeek ?? []).map((day) => ({
          date: day.date,
          dayAbbrev: day.dayAbbrev,
          numberOfGames: day.numberOfGames,
          games: (day.games ?? []).map((g) => {
            try { return mapGame(g) }
            catch { return null }
          }).filter(Boolean),
        }))
        setState({ days, loading: false, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        setState({ days: [], loading: false, error: err.message })
      })

    return () => { cancelled = true }
  }, [])

  return state
}

function mapTeam(t) {
  if (!t) return { abbrev: '', name: '', logo: '', score: null, record: '' }
  return {
    abbrev: t.abbrev ?? '',
    name: extractStr(t.commonName) || extractStr(t.name) || t.abbrev || '',
    logo: t.darkLogo ?? t.logo ?? '',
    score: t.score ?? null,
    record: t.record ?? '',
  }
}

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
