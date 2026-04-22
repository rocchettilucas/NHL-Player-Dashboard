// src/components/PlayoffBracket/PlayoffBracket.jsx
import { useState } from 'react'
import './PlayoffBracket.css'
import { extractStr } from '../../utils/formatters'
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner'

const ROUND_LABELS = {
  1: 'R1',
  2: 'R2',
  3: 'CF',
  4: 'SCF',
}

const CONFERENCE_FINAL_LABEL = {
  east: 'EASTERN',
  west: 'WESTERN',
}

export function PlayoffBracket({ bracketData, loading, error, onSelectTeam, isProjected }) {
  const [expandedSeries, setExpandedSeries] = useState(null)

  if (loading && !bracketData) {
    return (
      <section className="bracket-section">
        <h2 className="section-title">
          <span className="section-title__icon">🏆</span> Playoff Bracket
        </h2>
        <LoadingSpinner label="Loading playoff bracket..." />
      </section>
    )
  }

  if (error && !bracketData) {
    return (
      <section className="bracket-section">
        <h2 className="section-title">
          <span className="section-title__icon">🏆</span> Playoff Bracket
        </h2>
        <div className="bracket-coming-soon">
          <p className="bracket-coming-soon__text">Playoff bracket will appear here once matchups are set.</p>
          <p className="bracket-coming-soon__sub">Check back when the regular season ends.</p>
        </div>
      </section>
    )
  }

  if (!bracketData) return null

  const rounds = bracketData.rounds ?? []

  const eastern = { label: 'Eastern Conference', rounds: [] }
  const western = { label: 'Western Conference', rounds: [] }

  for (const round of rounds) {
    const roundNum = round.roundNumber ?? 0
    const series = round.series ?? []

    if (roundNum <= 2) {
      const eastSeries = series.filter((s) => (s.conference ?? '').toUpperCase() === 'E' || (s.conferenceAbbrev ?? '').toUpperCase() === 'E')
      const westSeries = series.filter((s) => (s.conference ?? '').toUpperCase() === 'W' || (s.conferenceAbbrev ?? '').toUpperCase() === 'W')
      eastern.rounds.push({ roundNumber: roundNum, series: eastSeries.length > 0 ? eastSeries : series.slice(0, series.length / 2) })
      western.rounds.push({ roundNumber: roundNum, series: westSeries.length > 0 ? westSeries : series.slice(series.length / 2) })
    } else if (roundNum === 3) {
      const eastSeries = series.filter((s) => (s.conference ?? '').toUpperCase() === 'E' || (s.conferenceAbbrev ?? '').toUpperCase() === 'E')
      const westSeries = series.filter((s) => (s.conference ?? '').toUpperCase() === 'W' || (s.conferenceAbbrev ?? '').toUpperCase() === 'W')
      if (eastSeries.length > 0) eastern.rounds.push({ roundNumber: roundNum, series: eastSeries })
      if (westSeries.length > 0) western.rounds.push({ roundNumber: roundNum, series: westSeries })
    }
  }

  const finalRound = rounds.find((r) => (r.roundNumber ?? 0) === 4)

  const toggleExpand = (seriesId) => {
    setExpandedSeries((prev) => (prev === seriesId ? null : seriesId))
  }

  return (
    <section className="bracket-section">
      <h2 className="section-title">
        <span className="section-title__icon">🏆</span> 2026 Stanley Cup Playoffs
      </h2>
      <p className="section-subtitle">
        {isProjected
          ? 'Projected bracket — based on current standings'
          : 'Live bracket — updated as series progress'}
      </p>

      <div className="bracket-desktop">
        <ConferenceBracket
          conference={western}
          conferenceKey="west"
          expandedSeries={expandedSeries}
          onToggle={toggleExpand}
          onSelectTeam={onSelectTeam}
        />
        <StanleyCupCenter finalRound={finalRound} expandedSeries={expandedSeries} onToggle={toggleExpand} onSelectTeam={onSelectTeam} />
        <ConferenceBracket
          conference={eastern}
          conferenceKey="east"
          expandedSeries={expandedSeries}
          onToggle={toggleExpand}
          onSelectTeam={onSelectTeam}
          reverse
        />
      </div>

      <div className="bracket-mobile">
        <MobileBracket
          rounds={rounds}
          expandedSeries={expandedSeries}
          onToggle={toggleExpand}
          onSelectTeam={onSelectTeam}
        />
      </div>
    </section>
  )
}

function ConferenceBracket({ conference, conferenceKey, expandedSeries, onToggle, onSelectTeam, reverse }) {
  return (
    <div className={`bracket-conference ${reverse ? 'bracket-conference--reverse' : ''}`}>
      <div className="bracket-conference__label">{conference.label}</div>
      <div className="bracket-conference__rounds">
        {conference.rounds.map((round) => (
          <div key={round.roundNumber} className="bracket-round">
            <div className="bracket-round-label bracket-round-label--top">{ROUND_LABELS[round.roundNumber]}</div>
            <div className="bracket-round__series">
              {round.series.map((s, i) => (
                <MatchupCard
                  key={s.seriesLetter ?? `${round.roundNumber}-${i}`}
                  series={s}
                  roundNumber={round.roundNumber}
                  conferenceKey={conferenceKey}
                  expanded={expandedSeries === (s.seriesLetter ?? `${round.roundNumber}-${i}`)}
                  onToggle={() => onToggle(s.seriesLetter ?? `${round.roundNumber}-${i}`)}
                  onSelectTeam={onSelectTeam}
                />
              ))}
            </div>
            <div className="bracket-round-label bracket-round-label--bottom">{ROUND_LABELS[round.roundNumber]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StanleyCupCenter({ finalRound, expandedSeries, onToggle, onSelectTeam }) {
  const finalSeries = finalRound?.series?.[0]
  const hasTeams = finalSeries?.topSeedTeam?.abbrev && finalSeries?.bottomSeedTeam?.abbrev

  if (hasTeams) {
    return (
      <div className="bracket-final">
        <MatchupCard
          series={finalSeries}
          roundNumber={4}
          conferenceKey={null}
          expanded={expandedSeries === (finalSeries.seriesLetter ?? 'final')}
          onToggle={() => onToggle(finalSeries.seriesLetter ?? 'final')}
          onSelectTeam={onSelectTeam}
        />
      </div>
    )
  }

  return (
    <div className="bracket-final bracket-final--placeholder">
      <div className="bracket-final__trophy" aria-label="2026 Stanley Cup Playoffs">
        <div className="bracket-final__year-top">20</div>
        <div className="bracket-final__trophy-icon">🏆</div>
        <div className="bracket-final__year-bottom">26</div>
      </div>
      <div className="matchup-card matchup-card--placeholder matchup-card--scf">
        <div className="matchup-card__conf-final-label">
          <span>STANLEY CUP</span>
          <span className="matchup-card__conf-final-sub">FINAL</span>
        </div>
      </div>
    </div>
  )
}

function MobileBracket({ rounds, expandedSeries, onToggle, onSelectTeam }) {
  const activeRound = [...rounds]
    .reverse()
    .find((r) =>
      (r.series ?? []).some(
        (s) => s.topSeedWins != null && s.bottomSeedWins != null &&
               s.topSeedWins < 4 && s.bottomSeedWins < 4
      )
    )

  const [openRound, setOpenRound] = useState(activeRound?.roundNumber ?? 1)

  return (
    <div className="bracket-mobile-rounds">
      {rounds.map((round) => {
        const roundNum = round.roundNumber ?? 0
        const series = round.series ?? []
        const isOpen = openRound === roundNum
        const completedCount = series.filter(
          (s) => s.topSeedWins === 4 || s.bottomSeedWins === 4
        ).length

        return (
          <div key={roundNum} className="bracket-mobile-round">
            <button
              className={`bracket-mobile-round__header ${isOpen ? 'bracket-mobile-round__header--open' : ''}`}
              onClick={() => setOpenRound(isOpen ? null : roundNum)}
            >
              <span>{ROUND_LABELS[roundNum] ?? `Round ${roundNum}`}</span>
              <span className="bracket-mobile-round__summary">
                {completedCount}/{series.length} complete
              </span>
              <span className="bracket-mobile-round__chevron">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <div className="bracket-mobile-round__series">
                {series.map((s, i) => (
                  <MatchupCard
                    key={s.seriesLetter ?? `${roundNum}-${i}`}
                    series={s}
                    expanded={expandedSeries === (s.seriesLetter ?? `${roundNum}-${i}`)}
                    onToggle={() => onToggle(s.seriesLetter ?? `${roundNum}-${i}`)}
                    onSelectTeam={onSelectTeam}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MatchupCard({ series, roundNumber, conferenceKey, expanded, onToggle, onSelectTeam }) {
  const top = series.topSeedTeam ?? series.topSeed ?? {}
  const bottom = series.bottomSeedTeam ?? series.bottomSeed ?? {}
  const topAbbrev = top.abbrev ?? ''
  const bottomAbbrev = bottom.abbrev ?? ''

  // Empty placeholder (TBD) variant: no teams assigned yet
  if (!topAbbrev && !bottomAbbrev) {
    const isConfFinal = roundNumber === 3
    const confLabel = isConfFinal && conferenceKey ? CONFERENCE_FINAL_LABEL[conferenceKey] : ''
    return (
      <div className={`matchup-card matchup-card--placeholder ${isConfFinal ? 'matchup-card--conf-final' : ''}`}>
        {isConfFinal ? (
          <div className="matchup-card__conf-final-label">
            <span>{confLabel}</span>
            <span className="matchup-card__conf-final-sub">CONFERENCE FINAL</span>
          </div>
        ) : (
          <div className="matchup-card__shield" aria-label="TBD">🛡</div>
        )}
      </div>
    )
  }

  const topWins = series.topSeedWins ?? 0
  const bottomWins = series.bottomSeedWins ?? 0
  const topAdvances = topWins === 4
  const bottomAdvances = bottomWins === 4
  const seriesComplete = topAdvances || bottomAdvances
  const topEliminated = bottomAdvances
  const bottomEliminated = topAdvances

  const topName = extractStr(top.name) || extractStr(top.commonName) || top.abbrev || 'TBD'
  const bottomName = extractStr(bottom.name) || extractStr(bottom.commonName) || bottom.abbrev || 'TBD'
  const topLogo = top.logo ?? top.darkLogo ?? ''
  const bottomLogo = bottom.logo ?? bottom.darkLogo ?? ''
  const topSeedRank = series.topSeedRankAbbrev ?? ''
  const bottomSeedRank = series.bottomSeedRankAbbrev ?? ''

  return (
    <div className={`matchup-card ${seriesComplete ? 'matchup-card--complete' : ''} ${!seriesComplete && topWins + bottomWins > 0 ? 'matchup-card--active' : ''}`}>
      <button className="matchup-card__main" onClick={onToggle}>
        <div className={`matchup-team ${topAdvances ? 'matchup-team--winner' : ''} ${topEliminated ? 'matchup-team--eliminated' : ''}`}>
          {topLogo && (
            <img
              className="matchup-team__logo"
              src={topLogo}
              alt={topAbbrev}
              onClick={(e) => { e.stopPropagation(); if (topAbbrev) onSelectTeam(topAbbrev) }}
            />
          )}
          <div className="matchup-team__identity">
            <span className="matchup-team__name">{topAbbrev || topName}</span>
            {topSeedRank && <span className="matchup-team__seed">({topSeedRank})</span>}
          </div>
          <span className="matchup-team__wins">{topWins}</span>
          {topAdvances && <span className="matchup-badge matchup-badge--advances">✓</span>}
          {topEliminated && <span className="matchup-badge matchup-badge--eliminated">✗</span>}
        </div>

        <div className={`matchup-team ${bottomAdvances ? 'matchup-team--winner' : ''} ${bottomEliminated ? 'matchup-team--eliminated' : ''}`}>
          {bottomLogo && (
            <img
              className="matchup-team__logo"
              src={bottomLogo}
              alt={bottomAbbrev}
              onClick={(e) => { e.stopPropagation(); if (bottomAbbrev) onSelectTeam(bottomAbbrev) }}
            />
          )}
          <div className="matchup-team__identity">
            <span className="matchup-team__name">{bottomAbbrev || bottomName}</span>
            {bottomSeedRank && <span className="matchup-team__seed">({bottomSeedRank})</span>}
          </div>
          <span className="matchup-team__wins">{bottomWins}</span>
          {bottomAdvances && <span className="matchup-badge matchup-badge--advances">✓</span>}
          {bottomEliminated && <span className="matchup-badge matchup-badge--eliminated">✗</span>}
        </div>
      </button>

      {expanded && series.games && (
        <div className="matchup-card__games">
          {(series.games ?? []).map((g, i) => (
            <div key={i} className="matchup-game">
              <span className="matchup-game__label">Game {i + 1}</span>
              {g.gameState === 'FUT' || !g.homeTeam ? (
                <span className="matchup-game__tbd">
                  {g.gameDate ? new Date(g.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                </span>
              ) : (
                <span className="matchup-game__score">
                  {g.awayTeam?.abbrev} {g.awayTeam?.score ?? 0} — {g.homeTeam?.score ?? 0} {g.homeTeam?.abbrev}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
