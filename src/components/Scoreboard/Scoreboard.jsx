import { useState } from 'react'
import './Scoreboard.css'
import { useScores, useSchedule } from '../../hooks/useScores'
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner'

const STATE_LABELS = {
  LIVE: 'LIVE',
  CRIT: 'LIVE',
  FUT: 'Scheduled',
  PRE: 'Pre-Game',
  FINAL: 'Final',
  OFF: 'Final',
}

function isLive(state) {
  return state === 'LIVE' || state === 'CRIT'
}

function isFinal(state) {
  return state === 'FINAL' || state === 'OFF'
}

function formatTime(utcStr) {
  if (!utcStr) return ''
  const d = new Date(utcStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function Scoreboard() {
  const { games: todayGames, currentDate, loading: scoresLoading } = useScores()
  const { days, loading: scheduleLoading } = useSchedule()
  const [activeDay, setActiveDay] = useState(null)

  const loading = scoresLoading || scheduleLoading

  // Build day tabs from schedule
  const dayTabs = days.map((d) => ({
    date: d.date,
    label: d.dayAbbrev,
    count: d.numberOfGames,
    games: d.games,
  }))

  // If no active day selected, default to today (currentDate)
  const selectedDate = activeDay || currentDate || (dayTabs[0]?.date ?? '')
  const selectedTab = dayTabs.find((d) => d.date === selectedDate)

  // For today, use the polled score data; for other days use schedule data
  const displayGames = selectedDate === currentDate ? todayGames : (selectedTab?.games ?? [])

  const liveGames = displayGames.filter((g) => isLive(g.gameState))
  const completedGames = displayGames.filter((g) => isFinal(g.gameState))
  const upcomingGames = displayGames.filter(
    (g) => !isLive(g.gameState) && !isFinal(g.gameState)
  )

  return (
    <section className="scoreboard-section">
      <h2 className="section-title">
        <span className="section-title__icon">📺</span> Games &amp; Scores
      </h2>
      <p className="section-subtitle">
        Live scores, today's results, and upcoming schedule
        {selectedDate === currentDate && (
          <span className="scoreboard-live-dot" title="Auto-refreshing every 60s" />
        )}
      </p>

      {/* Day selector tabs */}
      {dayTabs.length > 0 && (
        <div className="scoreboard-days">
          {dayTabs.map((d) => (
            <button
              key={d.date}
              className={`scoreboard-day ${d.date === selectedDate ? 'scoreboard-day--active' : ''} ${d.date === currentDate ? 'scoreboard-day--today' : ''}`}
              onClick={() => setActiveDay(d.date)}
            >
              <span className="scoreboard-day__label">{d.label}</span>
              <span className="scoreboard-day__date">{formatDate(d.date)}</span>
              <span className="scoreboard-day__count">{d.count} {d.count === 1 ? 'game' : 'games'}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <LoadingSpinner label="Loading scores..." />
      ) : displayGames.length === 0 ? (
        <div className="scoreboard-empty">No games scheduled for this day</div>
      ) : (
        <div className="scoreboard-groups">
          {liveGames.length > 0 && (
            <div className="scoreboard-group">
              <h3 className="scoreboard-group__title">
                <span className="scoreboard-live-indicator" /> Live Now
              </h3>
              <div className="scoreboard-grid">
                {liveGames.map((g) => <GameCard key={g.id} game={g} />)}
              </div>
            </div>
          )}

          {completedGames.length > 0 && (
            <div className="scoreboard-group">
              <h3 className="scoreboard-group__title">Final</h3>
              <div className="scoreboard-grid">
                {completedGames.map((g) => <GameCard key={g.id} game={g} />)}
              </div>
            </div>
          )}

          {upcomingGames.length > 0 && (
            <div className="scoreboard-group">
              <h3 className="scoreboard-group__title">Upcoming</h3>
              <div className="scoreboard-grid">
                {upcomingGames.map((g) => <GameCard key={g.id} game={g} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function GameCard({ game }) {
  const live = isLive(game.gameState)
  const final = isFinal(game.gameState)
  const hasScore = game.awayTeam.score != null && game.homeTeam.score != null

  const awayWins = hasScore && final && game.awayTeam.score > game.homeTeam.score
  const homeWins = hasScore && final && game.homeTeam.score > game.awayTeam.score

  return (
    <div className={`game-card ${live ? 'game-card--live' : ''}`}>
      {/* Status badge */}
      <div className="game-card__status">
        {live && (
          <>
            <span className="scoreboard-live-indicator" />
            <span className="game-card__period">
              P{game.period} {game.clock}
              {game.inIntermission ? ' INT' : ''}
            </span>
          </>
        )}
        {final && <span className="game-card__final">Final{game.periodType === 'OT' ? ' (OT)' : game.periodType === 'SO' ? ' (SO)' : ''}</span>}
        {!live && !final && (
          <span className="game-card__time">{formatTime(game.startTimeUTC)}</span>
        )}
      </div>

      {/* Away team */}
      <div className={`game-card__team ${awayWins ? 'game-card__team--winner' : ''}`}>
        <img className="game-card__logo" src={game.awayTeam.logo} alt={game.awayTeam.abbrev} />
        <span className="game-card__abbrev">{game.awayTeam.abbrev}</span>
        {hasScore && <span className="game-card__score">{game.awayTeam.score}</span>}
      </div>

      {/* Home team */}
      <div className={`game-card__team ${homeWins ? 'game-card__team--winner' : ''}`}>
        <img className="game-card__logo" src={game.homeTeam.logo} alt={game.homeTeam.abbrev} />
        <span className="game-card__abbrev">{game.homeTeam.abbrev}</span>
        {hasScore && <span className="game-card__score">{game.homeTeam.score}</span>}
      </div>
    </div>
  )
}
