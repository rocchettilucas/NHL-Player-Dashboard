import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import './GameLogChart.css'
import { prepareGameLog } from '../../utils/statsHelpers'
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner'
import { ErrorBanner } from '../ErrorBanner/ErrorBanner'

export function GameLogChart({ gameLog, loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="card game-log-card">
        <h2 className="card-title">Game Log (Last 20 Games)</h2>
        <LoadingSpinner label="Loading game log…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card game-log-card">
        <h2 className="card-title">Game Log (Last 20 Games)</h2>
        <ErrorBanner message={error} onRetry={onRetry} />
      </div>
    )
  }

  if (!gameLog) return null

  const data = prepareGameLog(gameLog, 20)

  if (data.length === 0) {
    return (
      <div className="card game-log-card">
        <h2 className="card-title">Game Log</h2>
        <div className="game-log-empty">
          <span>No game log available for the current season.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card game-log-card">
      <div className="game-log-header">
        <h2 className="card-title" style={{ marginBottom: 0 }}>
          Game Log
          <span className="game-log-subtitle"> — Last {data.length} Games</span>
        </h2>
        <div className="game-log-legend">
          <span className="gl-legend-item goals">Goals</span>
          <span className="gl-legend-item assists">Assists</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 48, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            angle={-45}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={24}
          />
          <Tooltip content={<GameLogTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="goals" stackId="pts" fill="var(--color-goals)" radius={[0, 0, 0, 0]} maxBarSize={28} />
          <Bar dataKey="assists" stackId="pts" fill="var(--color-assists)" radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function GameLogTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  const d = payload[0]?.payload
  if (!d) return null

  return (
    <div className="chart-tooltip game-log-tooltip">
      <div className="chart-tooltip__season">
        {d.label} — {d.homeAway} {d.opponent}
      </div>
      {d.opponentFull && d.opponentFull !== d.opponent && (
        <div className="gl-tooltip-opponent">{d.opponentFull}</div>
      )}
      <div className="gl-tooltip-grid">
        <span className="gl-stat-label">Goals</span>
        <span className="gl-stat-value goals">{d.goals}</span>
        <span className="gl-stat-label">Assists</span>
        <span className="gl-stat-value assists">{d.assists}</span>
        <span className="gl-stat-label">Points</span>
        <span className="gl-stat-value points">{d.points}</span>
        <span className="gl-stat-label">+/-</span>
        <span className={`gl-stat-value ${d.plusMinus > 0 ? 'pos' : d.plusMinus < 0 ? 'neg' : ''}`}>
          {d.plusMinus > 0 ? `+${d.plusMinus}` : d.plusMinus}
        </span>
        <span className="gl-stat-label">TOI</span>
        <span className="gl-stat-value">{d.toi}</span>
        <span className="gl-stat-label">Shots</span>
        <span className="gl-stat-value">{d.shots}</span>
        {d.ppPoints > 0 && (
          <>
            <span className="gl-stat-label">PP Pts</span>
            <span className="gl-stat-value">{d.ppPoints}</span>
          </>
        )}
        {d.pim > 0 && (
          <>
            <span className="gl-stat-label">PIM</span>
            <span className="gl-stat-value">{d.pim}</span>
          </>
        )}
      </div>
    </div>
  )
}
