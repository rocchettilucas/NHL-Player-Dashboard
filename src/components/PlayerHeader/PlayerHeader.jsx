import './PlayerHeader.css'
import { calcAge, formatHeight, formatName, extractStr } from '../../utils/formatters'
import { extractCareerTotals } from '../../utils/statsHelpers'
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner'
import { ErrorBanner } from '../ErrorBanner/ErrorBanner'

// Fallback SVG silhouette when headshot fails to load
const SILHOUETTE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='35' r='22' fill='%2330363d'/%3E%3Cellipse cx='50' cy='90' rx='38' ry='28' fill='%2330363d'/%3E%3C/svg%3E"

export function PlayerHeader({ data, loading, error, onRetry }) {
  if (loading) return <PlayerHeaderSkeleton />
  if (error) return (
    <div className="card player-header-error">
      <ErrorBanner message={error} onRetry={onRetry} />
    </div>
  )
  if (!data) return null

  const name = formatName(data.firstName, data.lastName)
  const age = calcAge(data.birthDate)
  const height = formatHeight(data.heightInInches)
  const weight = data.weightInPounds ? `${data.weightInPounds} lbs` : ''
  const birthCity = data.birthCity ? extractStr(data.birthCity) : ''
  const birthProvince = data.birthStateProvince ? extractStr(data.birthStateProvince) : ''
  const birthCountry = data.birthCountry ?? ''
  const birthLocation = [birthCity, birthProvince, birthCountry].filter(Boolean).join(', ')
  const teamAbbrev = data.currentTeamAbbrev ?? ''
  const teamName = extractStr(data.teamCommonName) || teamAbbrev
  const totals = extractCareerTotals(data)

  const metaParts = [
    data.position,
    data.sweaterNumber ? `#${data.sweaterNumber}` : null,
    teamAbbrev,
  ].filter(Boolean)

  const physicalParts = [
    age ? `Age ${age}` : null,
    height,
    weight,
  ].filter(Boolean)

  return (
    <div className="player-header card">
      {/* Hero background: faint team logo watermark */}
      {data.teamLogo && (
        <div
          className="player-header__hero-bg"
          style={{ backgroundImage: `url(${data.teamLogo})` }}
        />
      )}

      <div className="player-header__content">
        {/* Headshot */}
        <div className="player-header__headshot-wrap">
          <img
            className="player-header__headshot"
            src={data.headshot || SILHOUETTE}
            alt={name}
            onError={(e) => { e.currentTarget.src = SILHOUETTE }}
          />
        </div>

        {/* Info block */}
        <div className="player-header__info">
          <div className="player-header__name">{name}</div>

          <div className="player-header__meta">
            {metaParts.join(' · ')}
            {teamName && teamAbbrev && (
              <span className="player-header__team-label"> — {teamName}</span>
            )}
          </div>

          {physicalParts.length > 0 && (
            <div className="player-header__physical">{physicalParts.join(' · ')}</div>
          )}

          {birthLocation && (
            <div className="player-header__birth">Born: {birthLocation}</div>
          )}

          {totals && (
            <div className="player-header__stat-pills">
              <StatPill label="GP" value={totals.gp} />
              <StatPill label="G" value={totals.g} color="var(--color-goals)" />
              <StatPill label="A" value={totals.a} color="var(--color-assists)" />
              <StatPill label="PTS" value={totals.pts} color="var(--color-points)" />
            </div>
          )}
        </div>

        {/* Team logo */}
        {data.teamLogo && (
          <div className="player-header__logo-wrap">
            <img
              className="player-header__team-logo"
              src={data.teamLogo}
              alt={teamName}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div className="stat-pill">
      <span className="stat-pill__label">{label}</span>
      <span className="stat-pill__value" style={color ? { color } : undefined}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function PlayerHeaderSkeleton() {
  return (
    <div className="player-header card player-header--skeleton">
      <div className="player-header__content">
        <div className="skeleton player-header__headshot skeleton-circle" />
        <div className="player-header__info">
          <div className="skeleton skeleton-line" style={{ width: '220px', height: '28px', marginBottom: '10px' }} />
          <div className="skeleton skeleton-line" style={{ width: '160px', height: '16px', marginBottom: '8px' }} />
          <div className="skeleton skeleton-line" style={{ width: '200px', height: '14px', marginBottom: '8px' }} />
          <div className="skeleton skeleton-line" style={{ width: '140px', height: '14px', marginBottom: '16px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ width: '64px', height: '40px', borderRadius: '8px' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
