import './StatsTable.css'
import { getTableSeasons } from '../../utils/statsHelpers'
import { formatPlusMinus } from '../../utils/formatters'
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner'

export function StatsTable({ playerData, loading }) {
  if (loading) {
    return (
      <div className="card">
        <h2 className="card-title">Career Stats</h2>
        <LoadingSpinner label="Loading stats…" />
      </div>
    )
  }

  if (!playerData) return null

  const currentSeason = playerData.featuredStats?.season ?? null
  const rows = getTableSeasons(playerData.seasonTotals, currentSeason)

  if (rows.length === 0) {
    return (
      <div className="card">
        <h2 className="card-title">Career Stats</h2>
        <p className="stats-table-empty">No NHL regular season data available.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="card-title">Career Stats</h2>
      <div className="stats-table-wrapper">
        <table className="stats-table">
          <thead>
            <tr>
              <th>Season</th>
              <th>Team</th>
              <th className="num-col">GP</th>
              <th className="num-col">G</th>
              <th className="num-col">A</th>
              <th className="num-col">PTS</th>
              <th className="num-col">+/-</th>
              <th className="num-col">PIM</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.rawSeason}
                className={row.isCurrent ? 'stats-row--current' : ''}
              >
                <td className="season-col">
                  {row.season}
                  {row.isCurrent && (
                    <span className="current-badge" title="Current season">●</span>
                  )}
                </td>
                <td className="team-col">{row.team}</td>
                <td className="num-col">{row.gamesPlayed}</td>
                <td className="num-col stat-goals">{row.goals}</td>
                <td className="num-col stat-assists">{row.assists}</td>
                <td className="num-col stat-points">{row.points}</td>
                <td
                  className={`num-col ${
                    row.plusMinus > 0
                      ? 'positive'
                      : row.plusMinus < 0
                      ? 'negative'
                      : ''
                  }`}
                >
                  {formatPlusMinus(row.plusMinus)}
                </td>
                <td className="num-col">{row.pim}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
