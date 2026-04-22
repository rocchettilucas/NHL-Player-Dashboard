import './TeamsBrowser.css'
import { useStandings } from '../../hooks/useStandings'
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner'

const DIVISION_ORDER = ['A', 'M', 'C', 'P']
const DIVISION_NAMES = {
  A: 'Atlantic',
  M: 'Metropolitan',
  C: 'Central',
  P: 'Pacific',
}

export function TeamsBrowser({ onSelectTeam, playoffTeams }) {
  const { teams, loading } = useStandings()
  const playoffOnly = Array.isArray(playoffTeams) && playoffTeams.length > 0
  const playoffSet = playoffOnly ? new Set(playoffTeams) : null

  if (loading) {
    return (
      <section className="teams-section">
        <h2 className="section-title">
          <span className="section-title__icon">🏟️</span> Browse by Team
        </h2>
        <LoadingSpinner label="Loading teams..." />
      </section>
    )
  }

  const visibleTeams = playoffOnly ? teams.filter((t) => playoffSet.has(t.teamAbbrev)) : teams

  // Group teams by division
  const divisions = {}
  for (const t of visibleTeams) {
    const div = t.division || 'Other'
    if (!divisions[div]) divisions[div] = []
    divisions[div].push(t)
  }

  // Sort each division by points desc
  for (const div of Object.keys(divisions)) {
    divisions[div].sort((a, b) => b.points - a.points)
  }

  return (
    <section className="teams-section">
      <h2 className="section-title">
        <span className="section-title__icon">🏟️</span> {playoffOnly ? 'Playoff Teams' : 'Browse by Team'}
      </h2>
      <p className="section-subtitle">
        {playoffOnly
          ? `${visibleTeams.length} teams competing for the Stanley Cup — click to view their roster and stats`
          : 'Click a team to view their roster and stats'}
      </p>

      {DIVISION_ORDER.map((divKey) => {
        const divTeams = divisions[divKey]
        if (!divTeams?.length) return null
        return (
          <div key={divKey} className="teams-division">
            <h3 className="teams-division__title">{DIVISION_NAMES[divKey]} Division</h3>
            <div className="teams-grid">
              {divTeams.map((t) => (
                <button
                  key={t.teamAbbrev}
                  className="team-card"
                  onClick={() => onSelectTeam(t.teamAbbrev)}
                >
                  <img
                    className="team-card__logo"
                    src={t.teamLogo}
                    alt={t.teamCommonName}
                  />
                  <div className="team-card__info">
                    <span className="team-card__name">{t.teamCommonName}</span>
                    <span className="team-card__record">
                      {t.wins}-{t.losses}-{t.otLosses} &middot; {t.points} pts
                    </span>
                  </div>
                  {t.streakCode && (
                    <span className={`team-card__streak team-card__streak--${t.streakCode.toLowerCase()}`}>
                      {t.streakCode}{t.streakCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
