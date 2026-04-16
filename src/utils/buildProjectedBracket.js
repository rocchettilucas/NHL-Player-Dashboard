/**
 * Build a projected playoff bracket from current standings data.
 *
 * NHL playoff format:
 * - Top 3 from each division qualify, plus 2 wild cards per conference
 * - Division winners (seeds 1 & 2) face wild card teams
 * - Seeds 2 & 3 within each division face each other
 * - Higher seed gets home ice
 *
 * Returns data in the same shape as the real bracket API so PlayoffBracket
 * component works unchanged. All series start at 0-0.
 */
export function buildProjectedBracket(teams) {
  if (!teams || teams.length === 0) return null

  const east = teams.filter((t) => t.conference === 'E')
  const west = teams.filter((t) => t.conference === 'W')

  if (east.length < 8 || west.length < 8) return null

  const eastMatchups = buildConferenceMatchups(east)
  const westMatchups = buildConferenceMatchups(west)

  return {
    projected: true,
    rounds: [
      {
        roundNumber: 1,
        series: [
          ...eastMatchups.map((m) => ({ ...m, conferenceAbbrev: 'E' })),
          ...westMatchups.map((m) => ({ ...m, conferenceAbbrev: 'W' })),
        ],
      },
      {
        roundNumber: 2,
        series: [
          makeTBDSeries('E'),
          makeTBDSeries('E'),
          makeTBDSeries('W'),
          makeTBDSeries('W'),
        ],
      },
      {
        roundNumber: 3,
        series: [makeTBDSeries('E'), makeTBDSeries('W')],
      },
      {
        roundNumber: 4,
        series: [makeTBDSeries(null)],
      },
    ],
  }
}

function buildConferenceMatchups(confTeams) {
  // Sort by conference sequence
  const sorted = [...confTeams].sort((a, b) => a.conferenceSequence - b.conferenceSequence)

  // Get the two divisions in this conference
  const divisions = [...new Set(sorted.map((t) => t.division))]

  // Get division top 3 teams for each division
  const divTeams = {}
  for (const div of divisions) {
    divTeams[div] = sorted
      .filter((t) => t.division === div && t.divisionSequence <= 3)
      .sort((a, b) => a.divisionSequence - b.divisionSequence)
  }

  // Get wild card teams (wildcardSequence 1 and 2)
  const wildcards = sorted
    .filter((t) => t.wildcardSequence > 0)
    .sort((a, b) => a.wildcardSequence - b.wildcardSequence)
    .slice(0, 2)

  // Division winners
  const divWinners = divisions
    .map((div) => divTeams[div]?.[0])
    .filter(Boolean)
    .sort((a, b) => b.points - a.points) // Better record = higher seed

  const bestDivWinner = divWinners[0]
  const otherDivWinner = divWinners[1]

  // WC1 plays the best division winner, WC2 plays the other
  const wc1 = wildcards[0]
  const wc2 = wildcards[1]

  // Within each division winner's bracket:
  // Div winner vs worst WC, 2nd seed vs 3rd seed in that division
  const bestDiv = bestDivWinner?.division
  const otherDiv = otherDivWinner?.division

  const matchups = []

  // Matchup 1: Best division winner vs WC2 (worst wild card)
  if (bestDivWinner && wc2) {
    matchups.push(makeSeries(bestDivWinner, wc2, 'A'))
  }

  // Matchup 2: 2nd vs 3rd in best division
  if (bestDiv && divTeams[bestDiv]?.[1] && divTeams[bestDiv]?.[2]) {
    matchups.push(makeSeries(divTeams[bestDiv][1], divTeams[bestDiv][2], 'B'))
  }

  // Matchup 3: Other division winner vs WC1
  if (otherDivWinner && wc1) {
    matchups.push(makeSeries(otherDivWinner, wc1, 'C'))
  }

  // Matchup 4: 2nd vs 3rd in other division
  if (otherDiv && divTeams[otherDiv]?.[1] && divTeams[otherDiv]?.[2]) {
    matchups.push(makeSeries(divTeams[otherDiv][1], divTeams[otherDiv][2], 'D'))
  }

  return matchups
}

function makeSeries(topTeam, bottomTeam, letter) {
  return {
    seriesLetter: letter,
    topSeedWins: 0,
    bottomSeedWins: 0,
    topSeedTeam: makeTeamObj(topTeam),
    bottomSeedTeam: makeTeamObj(bottomTeam),
  }
}

function makeTBDSeries(conf) {
  return {
    conferenceAbbrev: conf,
    topSeedWins: 0,
    bottomSeedWins: 0,
    topSeedTeam: { abbrev: 'TBD', name: 'TBD', logo: '' },
    bottomSeedTeam: { abbrev: 'TBD', name: 'TBD', logo: '' },
  }
}

function makeTeamObj(team) {
  return {
    abbrev: team.teamAbbrev,
    name: team.teamCommonName || team.teamName,
    logo: team.teamLogo
      ? team.teamLogo.replace('_light.svg', '_dark.svg')
      : '',
  }
}
