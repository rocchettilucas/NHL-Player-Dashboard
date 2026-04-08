import { useState, useEffect } from 'react'

// Module-level cache: playerId → game log array
const CACHE = new Map()

/**
 * Fetch the current-season game log for a player.
 * @param {number|null} playerId
 * @returns {{ gameLog: object[], loading: boolean, error: string|null, retry: () => void }}
 */
export function useGameLog(playerId) {
  const [state, setState] = useState({ gameLog: [], loading: false, error: null })
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!playerId) {
      setState({ gameLog: [], loading: false, error: null })
      return
    }

    if (CACHE.has(playerId)) {
      setState({ gameLog: CACHE.get(playerId), loading: false, error: null })
      return
    }

    let cancelled = false
    setState({ gameLog: [], loading: true, error: null })

    fetch(`/nhl-api/v1/player/${playerId}/game-log/20252026/2`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        const log = data.gameLog ?? []
        CACHE.set(playerId, log)
        setState({ gameLog: log, loading: false, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        const msg = navigator.onLine
          ? `Could not load game log. ${err.message}`
          : 'Check your connection and try again.'
        setState({ gameLog: [], loading: false, error: msg })
      })

    return () => {
      cancelled = true
    }
  }, [playerId, retryCount])

  const retry = () => {
    CACHE.delete(playerId)
    setRetryCount((c) => c + 1)
  }

  return { ...state, retry }
}
