import { useState } from 'react'
import './App.css'

import { SearchBar } from './components/SearchBar/SearchBar'
import { PlayerHeader } from './components/PlayerHeader/PlayerHeader'
import { CareerChart } from './components/CareerChart/CareerChart'
import { GameLogChart } from './components/GameLogChart/GameLogChart'
import { StatsTable } from './components/StatsTable/StatsTable'
import { TrendingPlayers } from './components/TrendingPlayers/TrendingPlayers'
import { LeagueLeaders } from './components/LeagueLeaders/LeagueLeaders'
import { TeamsBrowser } from './components/TeamsBrowser/TeamsBrowser'
import { Scoreboard } from './components/Scoreboard/Scoreboard'
import { TeamPage } from './components/TeamPage/TeamPage'

import { CompareButton, PlayerComparisonPanel } from './components/PlayerComparison/PlayerComparison'

import { usePlayer } from './hooks/usePlayer'
import { useGameLog } from './hooks/useGameLog'


const POPULAR_PLAYERS = [
  { id: 8478402, name: 'Connor McDavid', team: 'EDM', pos: 'C' },
  { id: 8479318, name: 'Auston Matthews', team: 'TOR', pos: 'C' },
  { id: 8471675, name: 'Sidney Crosby', team: 'PIT', pos: 'C' },
  { id: 8477492, name: 'Nathan MacKinnon', team: 'COL', pos: 'C' },
  { id: 8480069, name: 'Cale Makar', team: 'COL', pos: 'D' },
  { id: 8478483, name: 'Mitch Marner', team: 'VGK', pos: 'RW' },
  { id: 8477956, name: 'David Pastrnak', team: 'BOS', pos: 'RW' },
  { id: 8476453, name: 'Nikita Kucherov', team: 'TBL', pos: 'RW' },
  { id: 8477934, name: 'Leon Draisaitl', team: 'EDM', pos: 'C' },
  { id: 8478864, name: 'Kirill Kaprizov', team: 'MIN', pos: 'LW' },
]

function getTeamLogoUrl(teamAbbrev) {
  return `https://assets.nhle.com/logos/nhl/svg/${teamAbbrev}_dark.svg`
}

export default function App() {
  const [primaryId, setPrimaryId] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [compareOpen, setCompareOpen] = useState(false)

  const {
    data: playerData,
    loading: playerLoading,
    error: playerError,
    retry: playerRetry,
  } = usePlayer(primaryId)

  const {
    gameLog,
    loading: gameLogLoading,
    error: gameLogError,
    retry: gameLogRetry,
  } = useGameLog(primaryId)

  const hasPlayer = !!primaryId
  const hasTeam = !!selectedTeam

  const handleSelectPlayer = (id) => {
    setSelectedTeam(null)
    setPrimaryId(id)
  }

  const handleSelectTeam = (abbrev) => {
    setPrimaryId(null)
    setSelectedTeam(abbrev)
  }

  const handleBackHome = () => {
    setPrimaryId(null)
    setSelectedTeam(null)
  }

  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="app-header">
        <div>
          <h1 className="app-title">
            <img
              className="app-title__logo"
              src="https://assets.nhle.com/logos/nhl/svg/NHL_light.svg"
              alt="NHL"
            />
            NHL <span>Player</span> Dashboard
          </h1>
          <p className="app-subtitle">
            Career stats, game logs & player comparison
          </p>
        </div>

        <div className="search-section">
          <SearchBar
            label="Player"
            placeholder="Search NHL player…"
            onSelect={handleSelectPlayer}
          />
        </div>
      </header>

      {/* ── Home page ──────────────────────────────────────── */}
      {!hasPlayer && !hasTeam && (
        <div className="home-page">
          {/* Popular Players */}
          <div className="home-section home-section--popular">
            <p className="popular-heading">Popular Players</p>
            <div className="popular-grid">
              {POPULAR_PLAYERS.map((p, i) => (
                <button
                  key={p.id}
                  className="popular-card"
                  style={{ animationDelay: `${i * 0.2}s` }}
                  onClick={() => handleSelectPlayer(p.id)}
                >
                  <div className="popular-card__logo-wrap">
                    <img
                      className="popular-card__team-logo"
                      src={getTeamLogoUrl(p.team)}
                      alt={p.team}
                      loading="lazy"
                    />
                  </div>
                  <div className="popular-card__info">
                    <span className="popular-card__name">{p.name}</span>
                    <span className="popular-card__meta">
                      {p.team} &middot; {p.pos}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scoreboard */}
          <div className="home-section">
            <Scoreboard />
          </div>

          {/* Trending Players */}
          <div className="home-section">
            <TrendingPlayers onSelectPlayer={handleSelectPlayer} />
          </div>

          {/* League Leaders */}
          <div className="home-section">
            <LeagueLeaders
              onSelectPlayer={handleSelectPlayer}
              onSelectTeam={handleSelectTeam}
            />
          </div>

          {/* Browse by Team */}
          <div className="home-section">
            <TeamsBrowser onSelectTeam={handleSelectTeam} />
          </div>
        </div>
      )}

      {/* ── Team page ────────────────────────────────────────── */}
      {hasTeam && !hasPlayer && (
        <TeamPage
          teamAbbrev={selectedTeam}
          onBack={handleBackHome}
          onSelectPlayer={handleSelectPlayer}
        />
      )}

      {/* ── Player Dashboard ─────────────────────────────────── */}
      {hasPlayer && (
        <>
          <div className="player-actions">
            <button className="back-button" onClick={handleBackHome}>
              &larr; Back to Home
            </button>
            <CompareButton onClick={() => setCompareOpen(true)} />
          </div>

          <PlayerHeader
            data={playerData}
            loading={playerLoading}
            error={playerError}
            onRetry={playerRetry}
          />

          <div className="dashboard-grid">
            <div className="charts-row">
              <CareerChart
                playerData={playerData}
                loading={playerLoading}
              />
              <GameLogChart
                gameLog={gameLog}
                loading={gameLogLoading}
                error={gameLogError}
                onRetry={gameLogRetry}
              />
            </div>

            <StatsTable playerData={playerData} loading={playerLoading} />
          </div>

          <PlayerComparisonPanel
            primaryData={playerData}
            isOpen={compareOpen}
            onClose={() => setCompareOpen(false)}
          />
        </>
      )}
      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="app-footer">
        <p className="app-footer__copy">&copy; {new Date().getFullYear()} Lucas Rocchetti. All rights reserved.</p>
        <p className="app-footer__powered">Stats powered by the <a href="https://www.nhl.com" target="_blank" rel="noopener noreferrer">NHL</a> &amp; <a href="https://api-web.nhle.com" target="_blank" rel="noopener noreferrer">NHL Web API</a></p>
      </footer>
    </div>
  )
}
