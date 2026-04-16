import { useState, useEffect, useRef } from 'react'

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
