import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import './PlayerComparison.css'
import { usePlayer } from '../../hooks/usePlayer'
import { useSearch } from '../../hooks/useSearch'
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner'
import { ErrorBanner } from '../ErrorBanner/ErrorBanner'
import {
  formatName,
  extractStr,
  formatHeight,
  calcAge,
  formatPlusMinus,
} from '../../utils/formatters'
import { getNHLRegularSeasons, mergeCareerData, extractCareerTotals } from '../../utils/statsHelpers'

const SILHOUETTE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='35' r='22' fill='%2330363d'/%3E%3Cellipse cx='50' cy='90' rx='38' ry='28' fill='%2330363d'/%3E%3C/svg%3E"

/**
 * "Compare Player" button that opens the comparison panel.
 */
export function CompareButton({ onClick }) {
  return (
    <button className="compare-btn" onClick={onClick}>
      <CompareIcon />
      Compare Player
    </button>
  )
}

/**
 * Full-screen modal panel for comparing two players side-by-side.
 */
export function PlayerComparisonPanel({ primaryData, isOpen, onClose }) {
  const [compareId, setCompareId] = useState(null)
  const {
    data: compareData,
    loading: compareLoading,
    error: compareError,
  } = usePlayer(compareId)

  // Reset compare player when panel closes
  useEffect(() => {
    if (!isOpen) setCompareId(null)
  }, [isOpen])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen || !primaryData) return null

  const primaryName = formatName(primaryData.firstName, primaryData.lastName)
  const compareName = compareData ? formatName(compareData.firstName, compareData.lastName) : null

  return (
    <div className="comparison-overlay" onClick={onClose}>
      <div className="comparison-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="comparison-panel__header">
          <h2 className="comparison-panel__title">Player Comparison</h2>
          <button className="comparison-panel__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {/* Search for second player */}
        <div className="comparison-panel__search">
          <ComparisonSearch
            onSelect={setCompareId}
            excludeId={primaryData.playerId}
          />
        </div>

        {/* Content */}
        <div className="comparison-panel__body">
          {!compareId && (
            <div className="comparison-empty">
              <p>Search for a player above to compare with <strong>{primaryName}</strong></p>
            </div>
          )}

          {compareId && compareLoading && (
            <LoadingSpinner label="Loading player data..." />
          )}

          {compareId && compareError && (
            <ErrorBanner message={compareError} />
          )}

          {compareId && compareData && (
            <ComparisonContent
              primary={primaryData}
              compare={compareData}
              primaryName={primaryName}
              compareName={compareName}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Inline search for the comparison panel ─────────────── */

function ComparisonSearch({ onSelect, excludeId }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef(null)
  const wrapperRef = useRef(null)
  const { results, loading } = useSearch(query)

  const filtered = results.filter((p) => p.playerId !== excludeId)

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = useCallback((player) => {
    onSelect(player.playerId)
    setQuery(player.name)
    setIsOpen(false)
  }, [onSelect])

  return (
    <div className="comp-search" ref={wrapperRef}>
      <input
        ref={inputRef}
        type="text"
        className="comp-search__input"
        placeholder="Search for a player to compare..."
        value={query}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true) }}
        onFocus={() => setIsOpen(true)}
      />
      {loading && query.trim() && (
        <div className="comp-search__spinner">
          <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
        </div>
      )}
      {isOpen && query.trim() && (filtered.length > 0 || loading) && (
        <div className="comp-search__dropdown">
          {filtered.length === 0 && loading && (
            <div className="comp-search__loading">Searching...</div>
          )}
          {filtered.length === 0 && !loading && (
            <div className="comp-search__empty">No players found</div>
          )}
          {filtered.map((p) => (
            <button
              key={p.playerId}
              className="comp-search__item"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(p) }}
            >
              <span className="comp-search__item-name">{p.name}</span>
              <span className="comp-search__item-meta">
                {p.teamAbbrev} {p.position && `· ${p.position}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Comparison content ─────────────────────────────────── */

function ComparisonContent({ primary, compare, primaryName, compareName }) {
  const primaryTotals = useMemo(() => extractCareerTotals(primary), [primary])
  const compareTotals = useMemo(() => extractCareerTotals(compare), [compare])

  const primarySeasons = useMemo(() => getNHLRegularSeasons(primary), [primary])
  const compareSeasons = useMemo(() => getNHLRegularSeasons(compare), [compare])

  // Current season stats from featuredStats
  const pFeat = primary.featuredStats?.regularSeason?.subSeason
  const cFeat = compare.featuredStats?.regularSeason?.subSeason

  // Points per game
  const pPpg = primaryTotals && primaryTotals.gp > 0
    ? (primaryTotals.pts / primaryTotals.gp).toFixed(2)
    : '—'
  const cPpg = compareTotals && compareTotals.gp > 0
    ? (compareTotals.pts / compareTotals.gp).toFixed(2)
    : '—'

  // Bar chart data for career totals
  const barData = useMemo(() => [
    {
      stat: 'GP',
      [primaryName]: primaryTotals?.gp ?? 0,
      [compareName]: compareTotals?.gp ?? 0,
    },
    {
      stat: 'Goals',
      [primaryName]: primaryTotals?.g ?? 0,
      [compareName]: compareTotals?.g ?? 0,
    },
    {
      stat: 'Assists',
      [primaryName]: primaryTotals?.a ?? 0,
      [compareName]: compareTotals?.a ?? 0,
    },
    {
      stat: 'Points',
      [primaryName]: primaryTotals?.pts ?? 0,
      [compareName]: compareTotals?.pts ?? 0,
    },
  ], [primaryTotals, compareTotals, primaryName, compareName])

  // Current season bar data
  const seasonBarData = useMemo(() => {
    if (!pFeat && !cFeat) return []
    return [
      { stat: 'GP', [primaryName]: pFeat?.gamesPlayed ?? 0, [compareName]: cFeat?.gamesPlayed ?? 0 },
      { stat: 'Goals', [primaryName]: pFeat?.goals ?? 0, [compareName]: cFeat?.goals ?? 0 },
      { stat: 'Assists', [primaryName]: pFeat?.assists ?? 0, [compareName]: cFeat?.assists ?? 0 },
      { stat: 'Points', [primaryName]: pFeat?.points ?? 0, [compareName]: cFeat?.points ?? 0 },
      { stat: '+/-', [primaryName]: pFeat?.plusMinus ?? 0, [compareName]: cFeat?.plusMinus ?? 0 },
    ]
  }, [pFeat, cFeat, primaryName, compareName])

  return (
    <div className="comparison-content">
      {/* Player cards side by side */}
      <div className="comparison-players">
        <PlayerCard data={primary} name={primaryName} side="left" />
        <div className="comparison-vs">VS</div>
        <PlayerCard data={compare} name={compareName} side="right" />
      </div>

      {/* Stat comparison table */}
      <div className="comparison-stats card">
        <h3 className="card-title">Career Totals</h3>
        <div className="comparison-table">
          <div className="comparison-table__header">
            <span className="comparison-table__player comparison-table__player--left">{primaryName}</span>
            <span className="comparison-table__stat-label">Stat</span>
            <span className="comparison-table__player comparison-table__player--right">{compareName}</span>
          </div>
          <StatRow label="GP" left={primaryTotals?.gp} right={compareTotals?.gp} />
          <StatRow label="Goals" left={primaryTotals?.g} right={compareTotals?.g} />
          <StatRow label="Assists" left={primaryTotals?.a} right={compareTotals?.a} />
          <StatRow label="Points" left={primaryTotals?.pts} right={compareTotals?.pts} />
          <StatRow label="PPG" left={pPpg} right={cPpg} />
        </div>
      </div>

      {/* Current season comparison */}
      {(pFeat || cFeat) && (
        <div className="comparison-stats card">
          <h3 className="card-title">Current Season</h3>
          <div className="comparison-table">
            <div className="comparison-table__header">
              <span className="comparison-table__player comparison-table__player--left">{primaryName}</span>
              <span className="comparison-table__stat-label">Stat</span>
              <span className="comparison-table__player comparison-table__player--right">{compareName}</span>
            </div>
            <StatRow label="GP" left={pFeat?.gamesPlayed} right={cFeat?.gamesPlayed} />
            <StatRow label="Goals" left={pFeat?.goals} right={cFeat?.goals} />
            <StatRow label="Assists" left={pFeat?.assists} right={cFeat?.assists} />
            <StatRow label="Points" left={pFeat?.points} right={cFeat?.points} />
            <StatRow label="+/-" left={pFeat?.plusMinus != null ? formatPlusMinus(pFeat.plusMinus) : '—'} right={cFeat?.plusMinus != null ? formatPlusMinus(cFeat.plusMinus) : '—'} />
          </div>
        </div>
      )}

      {/* Career totals bar chart */}
      <div className="comparison-chart card">
        <h3 className="card-title">Career Totals Comparison</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="stat"
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
              }}
              itemStyle={{ color: 'var(--color-text-primary)' }}
              labelStyle={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
            <Bar dataKey={primaryName} fill="var(--color-points)" radius={[4, 4, 0, 0]} />
            <Bar dataKey={compareName} fill="var(--color-goals)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Current season bar chart */}
      {seasonBarData.length > 0 && (
        <div className="comparison-chart card">
          <h3 className="card-title">Current Season Comparison</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={seasonBarData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="stat"
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
              />
              <YAxis
                tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                }}
                itemStyle={{ color: 'var(--color-text-primary)' }}
                labelStyle={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
              <Bar dataKey={primaryName} fill="var(--color-points)" radius={[4, 4, 0, 0]} />
              <Bar dataKey={compareName} fill="var(--color-assists)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

/* ── Player info card ───────────────────────────────────── */

function PlayerCard({ data, name, side }) {
  const teamAbbrev = data.currentTeamAbbrev ?? ''
  const teamName = extractStr(data.teamCommonName) || teamAbbrev
  const position = data.position ?? ''
  const number = data.sweaterNumber ? `#${data.sweaterNumber}` : ''
  const age = calcAge(data.birthDate)
  const height = formatHeight(data.heightInInches)
  const weight = data.weightInPounds ? `${data.weightInPounds} lbs` : ''

  return (
    <div className={`comparison-player-card comparison-player-card--${side}`}>
      <img
        className="comparison-player-card__headshot"
        src={data.headshot || SILHOUETTE}
        alt={name}
        onError={(e) => { e.currentTarget.src = SILHOUETTE }}
      />
      <div className="comparison-player-card__name">{name}</div>
      <div className="comparison-player-card__meta">
        {[position, number, teamAbbrev].filter(Boolean).join(' · ')}
      </div>
      <div className="comparison-player-card__detail">
        {[age ? `Age ${age}` : null, height, weight].filter(Boolean).join(' · ')}
      </div>
      {data.teamLogo && (
        <img
          className="comparison-player-card__team-logo"
          src={data.teamLogo}
          alt={teamName}
        />
      )}
    </div>
  )
}

/* ── Stat comparison row ────────────────────────────────── */

function StatRow({ label, left, right }) {
  const l = left ?? '—'
  const r = right ?? '—'
  const ln = typeof l === 'number' ? l : parseFloat(l)
  const rn = typeof r === 'number' ? r : parseFloat(r)
  const leftWins = !isNaN(ln) && !isNaN(rn) && ln > rn
  const rightWins = !isNaN(ln) && !isNaN(rn) && rn > ln

  return (
    <div className="comparison-table__row">
      <span className={`comparison-table__value comparison-table__value--left ${leftWins ? 'comparison-table__value--winner' : ''}`}>
        {l}
      </span>
      <span className="comparison-table__label">{label}</span>
      <span className={`comparison-table__value comparison-table__value--right ${rightWins ? 'comparison-table__value--winner' : ''}`}>
        {r}
      </span>
    </div>
  )
}

/* ── Icons ──────────────────────────────────────────────── */

function CompareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 2v12M12 2v12M1 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
