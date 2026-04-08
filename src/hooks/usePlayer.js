import { useState, useEffect } from 'react'

// Module-level cache: playerId → player data
const CACHE = new Map()

/**
 * Fetch and cache a player's full landing data from the NHL API.
 * @param {number|null} playerId
 * @returns {{ data: object|null, loading: boolean, error: string|null, retry: () => void }}
 */
export function usePlayer(playerId) {
  const [state, setState] = useState({ data: null, loading: false, error: null })
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!playerId) {
      setState({ data: null, loading: false, error: null })
      return
    }

    if (CACHE.has(playerId)) {
      setState({ data: CACHE.get(playerId), loading: false, error: null })
      return
    }

    let cancelled = false
    setState({ data: null, loading: true, error: null })

    fetch(`/nhl-api/v1/player/${playerId}/landing`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load player (HTTP ${r.status})`)
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        CACHE.set(playerId, data)
        setState({ data, loading: false, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        const msg = navigator.onLine
          ? `Could not load player data. ${err.message}`
          : 'Check your connection and try again.'
        setState({ data: null, loading: false, error: msg })
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
