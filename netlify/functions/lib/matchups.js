// Parses ESPN's boxscore/roster data (view=mBoxscore&view=mMatchupScore) for
// a given scoring period into matchup awards and player-level performances.
//
// NOTE: These field names (rosterForCurrentScoringPeriod, stats,
// statSourceId, lineupSlotId, etc.) come from ESPN's unofficial, undocumented
// API and have shifted across seasons in the past. If topPerformers/busts
// come back empty or wrong after your first live refresh, check the
// Netlify function logs for `update-rankings` / `refresh-now` — add a
// `console.log(JSON.stringify(espnData.schedule[0], null, 2))` here
// temporarily to see the real shape and adjust the field paths below.

const { teamName } = require('./rankings');

const BENCH_SLOT_ID = 20;
const IR_SLOT_ID = 21;

// Best-effort defaultPositionId -> label map. Verify against your league;
// ESPN has been inconsistent about DST's id across seasons (9 or 16).
const POSITION_MAP = {
  1: 'QB',
  2: 'RB',
  3: 'WR',
  4: 'TE',
  5: 'K',
  9: 'DST',
  16: 'DST',
};

function buildTeamNameMap(espnData) {
  const map = new Map();
  (espnData.teams || []).forEach((t) => map.set(t.id, teamName(t)));
  return map;
}

function computeMatchupAwards(espnData, week) {
  const nameById = buildTeamNameMap(espnData);

  // Exclude bye weeks (no "away" side present).
  const weekMatchups = (espnData.schedule || []).filter(
    (m) => m.matchupPeriodId === week && m.away
  );

  const matchups = weekMatchups.map((m) => {
    const homeScore = m.home.totalPoints || 0;
    const awayScore = m.away.totalPoints || 0;
    const margin = Math.abs(homeScore - awayScore);
    const homeWon = homeScore >= awayScore;

    return {
      homeTeam: nameById.get(m.home.teamId) || `Team ${m.home.teamId}`,
      awayTeam: nameById.get(m.away.teamId) || `Team ${m.away.teamId}`,
      homeScore,
      awayScore,
      margin,
      winner: homeWon ? nameById.get(m.home.teamId) : nameById.get(m.away.teamId),
      loser: homeWon ? nameById.get(m.away.teamId) : nameById.get(m.home.teamId),
      winnerScore: Math.max(homeScore, awayScore),
      loserScore: Math.min(homeScore, awayScore),
    };
  });

  if (!matchups.length) {
    return { matchups: [], closestGame: null, biggestBlowout: null };
  }

  const closestGame = [...matchups].sort((a, b) => a.margin - b.margin)[0];
  const biggestBlowout = [...matchups].sort((a, b) => b.margin - a.margin)[0];

  return { matchups, closestGame, biggestBlowout };
}

function getPointsBySource(player, week, statSourceId) {
  const stats = player.stats || [];
  const match = stats.find(
    (s) => s.scoringPeriodId === week && s.statSourceId === statSourceId
  );
  return match ? match.appliedTotal : null;
}

function extractPlayerPerformances(espnData, week) {
  const nameById = buildTeamNameMap(espnData);
  const performances = [];

  (espnData.schedule || []).forEach((m) => {
    ['home', 'away'].forEach((side) => {
      const teamSide = m[side];
      if (!teamSide || !teamSide.rosterForCurrentScoringPeriod) return;

      const entries = teamSide.rosterForCurrentScoringPeriod.entries || [];
      entries.forEach((entry) => {
        // Starters only — skip bench and IR.
        if (entry.lineupSlotId === BENCH_SLOT_ID || entry.lineupSlotId === IR_SLOT_ID) return;

        const player = entry.playerPoolEntry && entry.playerPoolEntry.player;
        if (!player) return;

        const actual =
          getPointsBySource(player, week, 0) ??
          entry.playerPoolEntry.appliedStatTotal ??
          null;
        const projected = getPointsBySource(player, week, 1);

        if (actual === null) return;

        performances.push({
          name: player.fullName,
          position: POSITION_MAP[player.defaultPositionId] || '—',
          team: nameById.get(teamSide.teamId) || `Team ${teamSide.teamId}`,
          actual,
          projected,
          delta: projected === null ? null : actual - projected,
        });
      });
    });
  });

  const topPerformers = [...performances].sort((a, b) => b.actual - a.actual).slice(0, 5);

  // Only judge "busts" against players who were actually expected to
  // produce (projected >= 8) so bench-fringe guys don't dominate the list.
  const bustCandidates = performances.filter((p) => p.projected !== null && p.projected >= 8);
  const busts = [...bustCandidates].sort((a, b) => a.delta - b.delta).slice(0, 5);

  return { topPerformers, busts };
}

module.exports = { computeMatchupAwards, extractPlayerPerformances };
