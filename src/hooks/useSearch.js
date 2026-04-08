import { useState, useEffect, useRef } from 'react'
import { extractStr } from '../utils/formatters'

const CURRENT_SEASON = '20252026'

/**
 * Debounced player search hook.
 * Calls the d3.hockey Solr search endpoint (proxied via /solr/).
 * @param {string} query
 * @param {number} debounceMs
 * @returns {{ results: SearchResult[], loading: boolean }}
 */
export function useSearch(query, debounceMs = 300) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      try {
        const url = `https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=8&q=${encodeURIComponent(query)}`
        const res = await fetch(url, { signal: abortRef.current.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const docs = await res.json()
        setResults((docs ?? []).map(mapNhlDoc))
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Player search failed:', err.message)
          setResults([])
        }
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, debounceMs])

  return { results, loading }
}

/**
 * Load the top points leaders as pre-populated search suggestions.
 * @returns {{ leaders: SearchResult[], loading: boolean }}
 */
export function useStatsLeaders() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(
      `/nhl-api/v1/skater-stats-leaders/${CURRENT_SEASON}/2?categories=points&limit=8`
    )
      .then((r) => r.json())
      .then((data) => {
        const pts = data?.points ?? []
        setLeaders(
          pts.map((p) => ({
            playerId: p.id,
            name: `${extractStr(p.firstName)} ${extractStr(p.lastName)}`.trim(),
            teamAbbrev: p.teamAbbrev ?? '',
            position: p.position ?? '',
            headshot: p.headshot ?? null,
          }))
        )
      })
      .catch(() => {
        // Silent failure — leaders are just a convenience pre-population
        setLeaders([])
      })
      .finally(() => setLoading(false))
  }, [])

  return { leaders, loading }
}

/** Map an NHL search API document to a normalized SearchResult */
function mapNhlDoc(doc) {
  return {
    playerId: parseInt(doc.playerId ?? 0, 10),
    name: doc.name ?? '',
    teamAbbrev: doc.teamAbbrev ?? doc.lastTeamAbbrev ?? '',
    position: doc.positionCode ?? '',
    headshot: null,
  }
}
