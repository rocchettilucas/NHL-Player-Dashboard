import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import './CareerChart.css'
import { getNHLRegularSeasons, mergeCareerData } from '../../utils/statsHelpers'
import { formatName } from '../../utils/formatters'
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner'

const SERIES = [
  { key: 'goals',   compareKey: 'compareGoals',   label: 'Goals',   color: 'var(--color-goals)' },
  { key: 'assists', compareKey: 'compareAssists', label: 'Assists', color: 'var(--color-assists)' },
  { key: 'points',  compareKey: 'comparePoints',  label: 'Points',  color: 'var(--color-points)' },
]

export function CareerChart({ playerData, compareData, loading }) {
  const [visible, setVisible] = useState({ goals: true, assists: true, points: true })

  const toggle = (key) => setVisible((v) => ({ ...v, [key]: !v[key] }))

  if (loading) {
    return (
      <div className="card career-chart-card">
        <h2 className="card-title">Career Stats</h2>
        <LoadingSpinner label="Loading career data…" />
      </div>
    )
  }

  if (!playerData) return null

  const primary = getNHLRegularSeasons(playerData)
  const compare = compareData ? getNHLRegularSeasons(compareData) : null
  const chartData = compare ? mergeCareerData(primary, compare) : primary

  const primaryName = formatName(playerData.firstName, playerData.lastName)
  const compareName = compareData ? formatName(compareData.firstName, compareData.lastName) : null

  if (chartData.length === 0) {
    return (
      <div className="card career-chart-card">
        <h2 className="card-title">Career Stats</h2>
        <p className="chart-empty">No NHL regular season data available.</p>
      </div>
    )
  }

  return (
    <div className="card career-chart-card">
      <div className="career-chart-header">
        <h2 className="card-title" style={{ marginBottom: 0 }}>Career Stats</h2>
        <div className="career-chart-toggles">
          {SERIES.map(({ key, label, color }) => (
            <button
              key={key}
              className={`toggle-btn ${visible[key] ? 'active' : 'inactive'}`}
              style={{ '--toggle-color': color }}
              onClick={() => toggle(key)}
              aria-pressed={visible[key]}
            >
              <span className="toggle-swatch" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {compare && (
        <div className="career-chart-legend">
          <span className="legend-item">
            <span className="legend-line solid" /> {primaryName}
          </span>
          <span className="legend-item">
            <span className="legend-line dashed" /> {compareName}
          </span>
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="season"
            tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip content={<CareerTooltip primaryName={primaryName} compareName={compareName} />} />

          {/* Primary player lines */}
          {SERIES.map(({ key, color }) =>
            visible[key] ? (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls={false}
              />
            ) : null
          )}

          {/* Compare player dashed lines */}
          {compare &&
            SERIES.map(({ compareKey, color }) =>
              visible[compareKey?.replace('compare', '').toLowerCase()] ? (
                <Line
                  key={compareKey}
                  type="monotone"
                  dataKey={compareKey}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  connectNulls={false}
                />
              ) : null
            )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function CareerTooltip({ active, payload, label, primaryName, compareName }) {
  if (!active || !payload?.length) return null

  const byKey = {}
  payload.forEach((p) => { byKey[p.dataKey] = p })

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__season">{label}</div>
      {['goals', 'assists', 'points'].map((key) => {
        const entry = byKey[key]
        if (!entry || entry.value == null) return null
        return (
          <div key={key} className="chart-tooltip__row">
            <span className="chart-tooltip__dot" style={{ background: entry.color }} />
            <span className="chart-tooltip__label">
              {primaryName ? `${primaryName} ` : ''}{key.charAt(0).toUpperCase() + key.slice(1)}
            </span>
            <span className="chart-tooltip__value">{entry.value}</span>
          </div>
        )
      })}
      {compareName &&
        ['compareGoals', 'compareAssists', 'comparePoints'].map((key) => {
          const entry = byKey[key]
          if (!entry || entry.value == null) return null
          const label = key.replace('compare', '').toLowerCase()
          return (
            <div key={key} className="chart-tooltip__row compare">
              <span className="chart-tooltip__dot dashed" style={{ background: entry.color }} />
              <span className="chart-tooltip__label">
                {compareName} {label.charAt(0).toUpperCase() + label.slice(1)}
              </span>
              <span className="chart-tooltip__value">{entry.value}</span>
            </div>
          )
        })}
    </div>
  )
}
