import { formatSeason, formatGameDate, extractStr } from './formatters'

/**
 * Filter and map a player's seasonTotals to NHL regular season data,
 * sorted chronologically (oldest first) for charting.
 */
export function getNHLRegularSeasons(playerData) {
  if (!playerData?.seasonTotals) return []
  return playerData.seasonTotals
    .filter((s) => s.leagueAbbrev === 'NHL' && s.gameTypeId === 2)
    .map((s) => ({
      season: formatSeason(s.season),
      rawSeason: s.season,
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
      points: s.points ?? 0,
      gamesPlayed: s.gamesPlayed ?? 0,
      team: extractStr(s.teamCommonName) || extractStr(s.teamName) || s.teamAbbrev || '',
    }))
    .sort((a, b) => a.rawSeason - b.rawSeason)
}

/**
 * Filter and map a player's seasonTotals to NHL playoff data,
 * sorted chronologically (oldest first) for charting.
 */
export function getNHLPlayoffSeasons(playerData) {
  if (!playerData?.seasonTotals) return []
  return playerData.seasonTotals
    .filter((s) => s.leagueAbbrev === 'NHL' && s.gameTypeId === 3)
    .map((s) => ({
      season: formatSeason(s.season),
      rawSeason: s.season,
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
      points: s.points ?? 0,
      gamesPlayed: s.gamesPlayed ?? 0,
      team: extractStr(s.teamCommonName) || extractStr(s.teamName) || s.teamAbbrev || '',
    }))
    .sort((a, b) => a.rawSeason - b.rawSeason)
}

/**
 * Build table rows from a player's seasonTotals, newest first.
 * currentSeason is the raw season integer (e.g. 20252026) used to flag the active row.
 */
export function getTableSeasons(seasonTotals, currentSeason) {
  if (!seasonTotals) return []
  return seasonTotals
    .filter((s) => s.leagueAbbrev === 'NHL' && s.gameTypeId === 2)
    .map((s) => ({
      season: formatSeason(s.season),
      rawSeason: s.season,
      team: extractStr(s.teamCommonName) || extractStr(s.teamName) || s.teamAbbrev || '',
      gamesPlayed: s.gamesPlayed ?? 0,
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
      points: s.points ?? 0,
      plusMinus: s.plusMinus ?? 0,
      pim: s.pim ?? 0,
      isCurrent: s.season === currentSeason,
    }))
    .sort((a, b) => b.rawSeason - a.rawSeason)
}

/**
 * Build playoff table rows from a player's seasonTotals, newest first.
 * currentSeason is the raw season integer (e.g. 20252026) used to flag the active row.
 */
export function getPlayoffTableSeasons(seasonTotals, currentSeason) {
  if (!seasonTotals) return []
  return seasonTotals
    .filter((s) => s.leagueAbbrev === 'NHL' && s.gameTypeId === 3)
    .map((s) => ({
      season: formatSeason(s.season),
      rawSeason: s.season,
      team: extractStr(s.teamCommonName) || extractStr(s.teamName) || s.teamAbbrev || '',
      gamesPlayed: s.gamesPlayed ?? 0,
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
      points: s.points ?? 0,
      plusMinus: s.plusMinus ?? 0,
      pim: s.pim ?? 0,
      isCurrent: s.season === currentSeason,
    }))
    .sort((a, b) => b.rawSeason - a.rawSeason)
}

/**
 * Prepare games from a game log for the bar chart.
 * @param {Array} gameLog - raw game log data
 * @param {number|null} count - number of games to show, or null for all games
 */
export function prepareGameLog(gameLog, count = 20) {
  if (!gameLog?.length) return []
  const sorted = [...gameLog].sort((a, b) => a.gameDate.localeCompare(b.gameDate))
  const sliced = count ? sorted.slice(-count) : sorted
  return sliced.map((g, i) => ({
    index: i + 1,
    label: formatGameDate(g.gameDate),
    gameDate: g.gameDate,
    opponent: g.opponentAbbrev ?? '',
    opponentFull: extractStr(g.opponentCommonName) || g.opponentAbbrev || '',
    homeAway: g.homeRoadFlag === 'H' ? 'vs' : '@',
    goals: g.goals ?? 0,
    assists: g.assists ?? 0,
    points: g.points ?? 0,
    plusMinus: g.plusMinus ?? 0,
    toi: g.toi ?? '0:00',
    shots: g.shots ?? 0,
    ppPoints: g.powerPlayPoints ?? 0,
    pim: g.pim ?? 0,
  }))
}

/**
 * Merge two players' career data by season for the comparison chart.
 * Seasons present in one but not the other get null values (Recharts handles null gaps).
 */
export function mergeCareerData(primary, compare) {
  const allSeasons = [
    ...new Set([...primary.map((s) => s.season), ...compare.map((s) => s.season)]),
  ].sort()

  const pMap = Object.fromEntries(primary.map((s) => [s.season, s]))
  const cMap = Object.fromEntries(compare.map((s) => [s.season, s]))

  return allSeasons.map((season) => ({
    season,
    goals: pMap[season]?.goals ?? null,
    assists: pMap[season]?.assists ?? null,
    points: pMap[season]?.points ?? null,
    compareGoals: cMap[season]?.goals ?? null,
    compareAssists: cMap[season]?.assists ?? null,
    comparePoints: cMap[season]?.points ?? null,
  }))
}

/**
 * Extract career totals from the player data object.
 */
export function extractCareerTotals(playerData) {
  const c = playerData?.careerTotals?.regularSeason
  if (!c) return null
  return {
    gp: c.gamesPlayed ?? 0,
    g: c.goals ?? 0,
    a: c.assists ?? 0,
    pts: c.points ?? 0,
  }
}

/**
 * Extract playoff career totals from the player data object.
 */
export function extractPlayoffCareerTotals(playerData) {
  const c = playerData?.careerTotals?.playoffs
  if (!c) return null
  return {
    gp: c.gamesPlayed ?? 0,
    g: c.goals ?? 0,
    a: c.assists ?? 0,
    pts: c.points ?? 0,
  }
}
