import { useState, useEffect, useRef } from 'react'
import { useStandings } from './useStandings'
import { buildProjectedBracket } from '../utils/buildProjectedBracket'

const PLAYOFF_YEAR = '2026'
const POLL_INTERVAL = 60_000

/**
 * The NHL bracket endpoint returns a flat `series` array spanning all four
 * rounds. The API's `playoffRound` field is unreliable (every non-R1 series
 * is tagged `playoffRound: 2` even for CF and SCF), so we derive the true
 * round from the series letter instead:
 *   A–H → R1 (8 series)  I–L → R2 (4 series)  M–N → R3 (2 series)  O → R4 (1 series)
 * Conference assignment follows the same letter convention:
 *   East: A,B,C,D (R1), I,J (R2), M (R3)
 *   West: E,F,G,H (R1), K,L (R2), N (R3)
 */
function roundFromLetter(letter) {
  if (!letter) return 1
  const idx = letter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0)
  if (idx < 8) return 1
  if (idx < 12) return 2
  if (idx < 14) return 3
  return 4
}

function conferenceFromLetter(letter) {
  if (!letter) return ''
  const idx = letter.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0)
  if (idx < 4) return 'E'          // A-D: R1 East
  if (idx < 8) return 'W'          // E-H: R1 West
  if (idx === 8 || idx === 9) return 'E'   // I,J: R2 East
  if (idx === 10 || idx === 11) return 'W' // K,L: R2 West
  if (idx === 12) return 'E'       // M: R3 East
  if (idx === 13) return 'W'       // N: R3 West
  return ''                        // O: R4 Stanley Cup (no conference)
}

function groupSeriesByRound(data) {
  const byRound = new Map()
  for (const s of data.series ?? []) {
    const r = roundFromLetter(s.seriesLetter)
    const tagged = { ...s, playoffRound: r, conferenceAbbrev: conferenceFromLetter(s.seriesLetter) }
    if (!byRound.has(r)) byRound.set(r, [])
    byRound.get(r).push(tagged)
  }
  const rounds = [1, 2, 3, 4].map((roundNumber) => ({
    roundNumber,
    series: byRound.get(roundNumber) ?? [],
  }))
  return { ...data, rounds }
}

/**
 * Fetch the playoff bracket and poll for updates.
 * Falls back to a projected bracket built from standings when the
 * real bracket endpoint isn't available yet (pre-playoffs).
 *
 * @returns {{ bracketData: object|null, loading: boolean, error: string|null, isProjected: boolean }}
 */
export function usePlayoffBracket() {
  const [state, setState] = useState({ bracketData: null, loading: true, error: null, isProjected: false })
  const intervalRef = useRef(null)
  const realBracketAvailable = useRef(false)

  const { teams } = useStandings()

  // Try the real bracket API
  useEffect(() => {
    let cancelled = false

    const fetchBracket = () => {
      fetch(`/nhl-api/v1/playoff-bracket/${PLAYOFF_YEAR}`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((data) => {
          if (cancelled) return
          if (!data?.series || data.series.length === 0) {
            throw new Error('Empty bracket')
          }
          realBracketAvailable.current = true
          setState({ bracketData: groupSeriesByRound(data), loading: false, error: null, isProjected: false })
        })
        .catch(() => {
          if (cancelled) return
          // Real bracket not available — will use projected
          if (!realBracketAvailable.current) {
            setState((prev) => ({
              ...prev,
              loading: false,
            }))
          }
        })
    }

    fetchBracket()
    intervalRef.current = setInterval(fetchBracket, POLL_INTERVAL)

    return () => {
      cancelled = true
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Build projected bracket from standings when real bracket isn't available
  useEffect(() => {
    if (realBracketAvailable.current) return
    if (!teams || teams.length === 0) return

    const projected = buildProjectedBracket(teams)
    if (projected) {
      setState((prev) => {
        // Don't overwrite real bracket data
        if (prev.bracketData && !prev.isProjected) return prev
        return { bracketData: projected, loading: false, error: null, isProjected: true }
      })
    }
  }, [teams])

  return state
}
