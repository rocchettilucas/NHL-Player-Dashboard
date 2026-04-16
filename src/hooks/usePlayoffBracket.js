import { useState, useEffect, useRef } from 'react'
import { useStandings } from './useStandings'
import { buildProjectedBracket } from '../utils/buildProjectedBracket'

const CURRENT_SEASON = '20252026'
const POLL_INTERVAL = 60_000

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
      fetch(`/nhl-api/v1/playoff-bracket/${CURRENT_SEASON}`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((data) => {
          if (cancelled) return
          realBracketAvailable.current = true
          setState({ bracketData: data, loading: false, error: null, isProjected: false })
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
