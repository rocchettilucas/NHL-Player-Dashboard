import { useState, useEffect } from 'react'

// Module-level cache: "playerId-gameType" → game log array
const CACHE = new Map()

/**
 * Fetch the current-season game log for a player.
 * @param {number|null} playerId
 * @param {number} gameType - 2 for regular season, 3 for playoffs
 * @returns {{ gameLog: object[], loading: boolean, error: string|null, retry: () => void }}
 */
export function useGameLog(playerId, gameType = 2) {
  const [state, setState] = useState({ gameLog: [], loading: false, error: null })
  const [retryCount, setRetryCount] = useState(0)

  const cacheKey = playerId ? `${playerId}-${gameType}` : null

  useEffect(() => {
    if (!playerId) {
      setState({ gameLog: [], loading: false, error: null })
      return
    }

    if (CACHE.has(cacheKey)) {
      setState({ gameLog: CACHE.get(cacheKey), loading: false, error: null })
      return
    }

    let cancelled = false
    setState({ gameLog: [], loading: true, error: null })

    fetch(`/nhl-api/v1/player/${playerId}/game-log/20252026/${gameType}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        const log = data.gameLog ?? []
        CACHE.set(cacheKey, log)
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
  }, [playerId, gameType, retryCount, cacheKey])

  const retry = () => {
    CACHE.delete(cacheKey)
    setRetryCount((c) => c + 1)
  }

  return { ...state, retry }
}
