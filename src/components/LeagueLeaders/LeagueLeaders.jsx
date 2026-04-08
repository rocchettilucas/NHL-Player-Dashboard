import { useState } from 'react'
import './LeagueLeaders.css'
import { useSkaterLeaders, useGoalieLeaders } from '../../hooks/useLeaders'
import { useStandings } from '../../hooks/useStandings'
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner'

const SKATER_TABS = [
  { key: 'points', label: 'Points', color: 'var(--color-points)' },
  { key: 'goals', label: 'Goals', color: 'var(--color-goals)' },
  { key: 'assists', label: 'Assists', color: 'var(--color-assists)' },
]

const GOALIE_TABS = [
  { key: 'savePctg', label: 'SV%', format: (v) => v.toFixed(3) },
  { key: 'gaa', label: 'GAA', format: (v) => v.toFixed(2) },
  { key: 'shutouts', label: 'SO', format: (v) => v },
]

const TEAM_TABS = [
  { key: 'points', label: 'Points', getter: (t) => t.points },
  { key: 'wins', label: 'Wins', getter: (t) => t.wins },
  { key: 'goalFor', label: 'Goals For', getter: (t) => t.goalFor },
  { key: 'goalAgainst', label: 'Goals Against', getter: (t) => t.goalAgainst, ascending: true },
]

export function LeagueLeaders({ onSelectPlayer, onSelectTeam }) {
  const [skaterTab, setSkaterTab] = useState('points')
  const [goalieTab, setGoalieTab] = useState('savePctg')
  const [teamTab, setTeamTab] = useState('points')

  const { data: skaterData, loading: skaterLoading } = useSkaterLeaders(10)
  const { data: goalieData, loading: goalieLoading } = useGoalieLeaders(10)
  const { teams, loading: teamsLoading } = useStandings()

  const activeSkaterTab = SKATER_TABS.find((t) => t.key === skaterTab)
  const activeGoalieTab = GOALIE_TABS.find((t) => t.key === goalieTab)
  const activeTeamTab = TEAM_TABS.find((t) => t.key === teamTab)

  const sortedTeams = [...teams]
    .sort((a, b) =>
      activeTeamTab.ascending
        ? activeTeamTab.getter(a) - activeTeamTab.getter(b)
        : activeTeamTab.getter(b) - activeTeamTab.getter(a)
    )
    .slice(0, 10)

  return (
    <section className="leaders-section">
      <h2 className="section-title">
        <span className="section-title__icon">🏆</span> League Leaders
      </h2>
      <p className="section-subtitle">Top performers across the NHL this season</p>

      <div className="leaders-grid">
        {/* Skaters */}
        <div className="leaders-panel card">
          <div className="leaders-panel__header">
            <h3 className="leaders-panel__title">Skaters</h3>
            <div className="leaders-tabs">
              {SKATER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`leaders-tab ${skaterTab === tab.key ? 'leaders-tab--active' : ''}`}
                  onClick={() => setSkaterTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {skaterLoading ? (
            <LoadingSpinner label="Loading skater leaders..." />
          ) : (
            <div className="leaders-list">
              {(skaterData?.[skaterTab] ?? []).map((p, i) => (
                <button
                  key={p.id}
                  className="leaders-row"
                  onClick={() => onSelectPlayer(p.id)}
                >
                  <span className="leaders-row__rank">{i + 1}</span>
                  <img
                    className="leaders-row__headshot"
                    src={p.headshot}
                    alt=""
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                  <div className="leaders-row__info">
                    <span className="leaders-row__name">{p.name}</span>
                    <span className="leaders-row__meta">{p.teamAbbrev} &middot; {p.position}</span>
                  </div>
                  <span
                    className="leaders-row__value"
                    style={{ color: activeSkaterTab?.color }}
                  >
                    {p.value}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Goalies */}
        <div className="leaders-panel card">
          <div className="leaders-panel__header">
            <h3 className="leaders-panel__title">Goalies</h3>
            <div className="leaders-tabs">
              {GOALIE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`leaders-tab ${goalieTab === tab.key ? 'leaders-tab--active' : ''}`}
                  onClick={() => setGoalieTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {goalieLoading ? (
            <LoadingSpinner label="Loading goalie leaders..." />
          ) : (
            <div className="leaders-list">
              {(goalieData?.[goalieTab] ?? []).map((p, i) => (
                <button
                  key={p.id}
                  className="leaders-row"
                  onClick={() => onSelectPlayer(p.id)}
                >
                  <span className="leaders-row__rank">{i + 1}</span>
                  <img
                    className="leaders-row__headshot"
                    src={p.headshot}
                    alt=""
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                  <div className="leaders-row__info">
                    <span className="leaders-row__name">{p.name}</span>
                    <span className="leaders-row__meta">{p.teamAbbrev}</span>
                  </div>
                  <span className="leaders-row__value">
                    {activeGoalieTab?.format(p.value) ?? p.value}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Teams */}
        <div className="leaders-panel card">
          <div className="leaders-panel__header">
            <h3 className="leaders-panel__title">Teams</h3>
            <div className="leaders-tabs">
              {TEAM_TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`leaders-tab ${teamTab === tab.key ? 'leaders-tab--active' : ''}`}
                  onClick={() => setTeamTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {teamsLoading ? (
            <LoadingSpinner label="Loading team standings..." />
          ) : (
            <div className="leaders-list">
              {sortedTeams.map((t, i) => (
                <button
                  key={t.teamAbbrev}
                  className="leaders-row"
                  onClick={() => onSelectTeam(t.teamAbbrev)}
                >
                  <span className="leaders-row__rank">{i + 1}</span>
                  <img
                    className="leaders-row__headshot leaders-row__headshot--logo"
                    src={t.teamLogo}
                    alt=""
                  />
                  <div className="leaders-row__info">
                    <span className="leaders-row__name">{t.teamCommonName}</span>
                    <span className="leaders-row__meta">
                      {t.wins}W-{t.losses}L-{t.otLosses}OTL
                    </span>
                  </div>
                  <span className="leaders-row__value">
                    {activeTeamTab.getter(t)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
