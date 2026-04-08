import { useState, useRef, useEffect, useCallback } from 'react'
import './SearchBar.css'
import { useSearch, useStatsLeaders } from '../../hooks/useSearch'

const POSITION_COLORS = {
  C: '#58a6ff',
  LW: '#3fb950',
  RW: '#f85149',
  D: '#d29922',
  G: '#bc8cff',
}

export function SearchBar({ label = 'Player', placeholder = 'Search NHL player…', onSelect }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef(null)
  const wrapperRef = useRef(null)

  const { results: searchResults, loading: searchLoading } = useSearch(query)
  const { leaders } = useStatsLeaders()

  // Items shown in dropdown: search results if query, otherwise leaders pre-population
  const items = query.trim() ? searchResults : leaders

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Reset active index when items change
  useEffect(() => {
    setActiveIndex(-1)
  }, [items])

  const handleSelect = useCallback(
    (player) => {
      onSelect(player.playerId)
      setQuery('')
      setIsOpen(false)
      setActiveIndex(-1)
      inputRef.current?.blur()
    },
    [onSelect]
  )

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setIsOpen(true)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && items[activeIndex]) {
        handleSelect(items[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  const showDropdown = isOpen && (items.length > 0 || searchLoading)

  return (
    <div className="search-wrapper" ref={wrapperRef}>
      {label && <label className="search-label">{label}</label>}
      <div className="search-input-row">
        <div className="search-icon" aria-hidden="true">
          <SearchIcon />
        </div>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={query}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          aria-label={`${label} search`}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
        />
        {searchLoading && query.trim() && (
          <div className="search-spinner" aria-hidden="true">
            <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
          </div>
        )}
        {query && (
          <button
            className="search-clear"
            onClick={() => { setQuery(''); inputRef.current?.focus() }}
            aria-label="Clear search"
            tabIndex={-1}
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="search-dropdown" role="listbox">
          {!query.trim() && leaders.length > 0 && (
            <div className="search-dropdown__section-header">Top Point Scorers</div>
          )}
          {items.length === 0 && searchLoading && (
            <div className="search-dropdown__loading">Searching…</div>
          )}
          {items.length === 0 && !searchLoading && query.trim() && (
            <div className="search-dropdown__empty">No players found for "{query}"</div>
          )}
          {items.map((player, i) => (
            <div
              key={player.playerId || i}
              className={`search-item ${i === activeIndex ? 'search-item--active' : ''}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(player) }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {/* Small headshot if available (from leaders) */}
              {player.headshot ? (
                <img
                  className="search-item__headshot"
                  src={player.headshot}
                  alt=""
                  aria-hidden="true"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <div className="search-item__avatar" aria-hidden="true">
                  <span>{getInitials(player.name)}</span>
                </div>
              )}

              <div className="search-item__text">
                <span className="search-item__name">{player.name}</span>
                <span className="search-item__meta">
                  {player.teamAbbrev && (
                    <span className="search-item__team">{player.teamAbbrev}</span>
                  )}
                  {player.position && (
                    <span
                      className="search-badge"
                      style={{ '--badge-color': POSITION_COLORS[player.position] || 'var(--color-text-muted)' }}
                    >
                      {player.position}
                    </span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
