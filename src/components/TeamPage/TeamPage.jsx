import './TeamPage.css'
import { useTeamRoster, useTeamStats } from '../../hooks/useTeam'
import { useStandings } from '../../hooks/useStandings'
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner'
import { ErrorBanner } from '../ErrorBanner/ErrorBanner'
import { formatHeight, calcAge } from '../../utils/formatters'

export function TeamPage({ teamAbbrev, onBack, onSelectPlayer }) {
  const { roster, loading: rosterLoading, error: rosterError } = useTeamRoster(teamAbbrev)
  const { stats, loading: statsLoading, error: statsError } = useTeamStats(teamAbbrev)
  const { teams } = useStandings()

  const teamInfo = teams.find((t) => t.teamAbbrev === teamAbbrev)
  const loading = rosterLoading || statsLoading

  return (
    <div className="team-page">
      <button className="back-button" onClick={onBack}>
        &larr; Back to Home
      </button>

      {/* Team header */}
      <div className="team-page__header card">
        {teamInfo && (
          <>
            <img
              className="team-page__logo"
              src={teamInfo.teamLogo}
              alt={teamInfo.teamCommonName}
            />
            <div className="team-page__title-block">
              <h2 className="team-page__name">{teamInfo.teamName}</h2>
              <div className="team-page__meta">
                {teamInfo.conference}C &middot; {teamInfo.division} Division
              </div>
              <div className="team-page__standings-row">
                <StatBox label="W" value={teamInfo.wins} />
                <StatBox label="L" value={teamInfo.losses} />
                <StatBox label="OTL" value={teamInfo.otLosses} />
                <StatBox label="PTS" value={teamInfo.points} color="var(--color-points)" />
                <StatBox label="GF" value={teamInfo.goalFor} color="var(--color-assists)" />
                <StatBox label="GA" value={teamInfo.goalAgainst} color="var(--color-goals)" />
                <StatBox label="DIFF" value={teamInfo.goalDifferential > 0 ? `+${teamInfo.goalDifferential}` : teamInfo.goalDifferential} />
              </div>
            </div>
          </>
        )}
        {!teamInfo && !loading && <h2 className="team-page__name">{teamAbbrev}</h2>}
      </div>

      {rosterError && <ErrorBanner message={`Roster: ${rosterError}`} />}
      {statsError && <ErrorBanner message={`Stats: ${statsError}`} />}

      {loading ? (
        <LoadingSpinner label={`Loading ${teamAbbrev} data...`} />
      ) : (
        <div className="team-page__content">
          {/* Team skater stats */}
          {stats?.skaters?.length > 0 && (
            <div className="card team-page__stats-card">
              <h3 className="card-title">Skater Stats</h3>
              <div className="team-stats-table-wrap">
                <table className="team-stats-table">
                  <thead>
                    <tr>
                      <th className="team-stats-th team-stats-th--name">Player</th>
                      <th className="team-stats-th">POS</th>
                      <th className="team-stats-th">GP</th>
                      <th className="team-stats-th" style={{ color: 'var(--color-goals)' }}>G</th>
                      <th className="team-stats-th" style={{ color: 'var(--color-assists)' }}>A</th>
                      <th className="team-stats-th" style={{ color: 'var(--color-points)' }}>PTS</th>
                      <th className="team-stats-th">+/-</th>
                      <th className="team-stats-th">PIM</th>
                      <th className="team-stats-th">S</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...stats.skaters]
                      .sort((a, b) => b.points - a.points)
                      .map((s) => (
                        <tr
                          key={s.playerId}
                          className="team-stats-row"
                          onClick={() => onSelectPlayer(s.playerId)}
                        >
                          <td className="team-stats-td team-stats-td--name">
                            <img
                              className="team-stats-headshot"
                              src={s.headshot}
                              alt=""
                              onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                            {s.name}
                          </td>
                          <td className="team-stats-td">{s.positionCode}</td>
                          <td className="team-stats-td team-stats-td--num">{s.gamesPlayed}</td>
                          <td className="team-stats-td team-stats-td--num">{s.goals}</td>
                          <td className="team-stats-td team-stats-td--num">{s.assists}</td>
                          <td className="team-stats-td team-stats-td--num team-stats-td--bold">{s.points}</td>
                          <td className={`team-stats-td team-stats-td--num ${s.plusMinus > 0 ? 'team-stats-td--pos' : s.plusMinus < 0 ? 'team-stats-td--neg' : ''}`}>
                            {s.plusMinus > 0 ? `+${s.plusMinus}` : s.plusMinus}
                          </td>
                          <td className="team-stats-td team-stats-td--num">{s.pim}</td>
                          <td className="team-stats-td team-stats-td--num">{s.shots}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Goalie stats */}
          {stats?.goalies?.length > 0 && (
            <div className="card team-page__stats-card">
              <h3 className="card-title">Goalie Stats</h3>
              <div className="team-stats-table-wrap">
                <table className="team-stats-table">
                  <thead>
                    <tr>
                      <th className="team-stats-th team-stats-th--name">Player</th>
                      <th className="team-stats-th">GP</th>
                      <th className="team-stats-th">W</th>
                      <th className="team-stats-th">L</th>
                      <th className="team-stats-th">OTL</th>
                      <th className="team-stats-th">GAA</th>
                      <th className="team-stats-th">SV%</th>
                      <th className="team-stats-th">SO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.goalies.map((g) => (
                      <tr
                        key={g.playerId}
                        className="team-stats-row"
                        onClick={() => onSelectPlayer(g.playerId)}
                      >
                        <td className="team-stats-td team-stats-td--name">
                          <img
                            className="team-stats-headshot"
                            src={g.headshot}
                            alt=""
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                          {g.name}
                        </td>
                        <td className="team-stats-td team-stats-td--num">{g.gamesPlayed}</td>
                        <td className="team-stats-td team-stats-td--num">{g.wins}</td>
                        <td className="team-stats-td team-stats-td--num">{g.losses}</td>
                        <td className="team-stats-td team-stats-td--num">{g.otLosses}</td>
                        <td className="team-stats-td team-stats-td--num">{g.gaa.toFixed(2)}</td>
                        <td className="team-stats-td team-stats-td--num">{g.savePctg.toFixed(3)}</td>
                        <td className="team-stats-td team-stats-td--num">{g.shutouts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Roster */}
          {roster && (
            <div className="card team-page__stats-card">
              <h3 className="card-title">Roster</h3>
              {['forwards', 'defensemen', 'goalies'].map((group) => {
                const players = roster[group]
                if (!players?.length) return null
                return (
                  <div key={group} className="roster-group">
                    <h4 className="roster-group__title">
                      {group.charAt(0).toUpperCase() + group.slice(1)}
                    </h4>
                    <div className="roster-grid">
                      {players.map((p) => (
                        <button
                          key={p.id}
                          className="roster-player"
                          onClick={() => onSelectPlayer(p.id)}
                        >
                          <img
                            className="roster-player__headshot"
                            src={p.headshot}
                            alt=""
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                          <div className="roster-player__info">
                            <span className="roster-player__name">
                              #{p.sweaterNumber} {p.name}
                            </span>
                            <span className="roster-player__meta">
                              {p.positionCode} &middot; {formatHeight(p.heightInInches)} &middot; {p.weightInPounds} lbs
                              {p.birthDate ? ` &middot; Age ${calcAge(p.birthDate)}` : ''}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div className="team-stat-box">
      <span className="team-stat-box__label">{label}</span>
      <span className="team-stat-box__value" style={color ? { color } : undefined}>{value}</span>
    </div>
  )
}
