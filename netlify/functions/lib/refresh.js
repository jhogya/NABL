const { getStore } = require('@netlify/blobs');
const { fetchLeague } = require('./espn');
const { computePowerRankings, buildRecap } = require('./rankings');
const { computeMatchupAwards, extractPlayerPerformances } = require('./matchups');
const { generateAiRecap } = require('./ai-recap');

const STORE_NAME = 'fantasy-genius-clone';
const HISTORY_KEY = 'rankings-history';
const LATEST_KEY = 'rankings-latest';

async function refreshRankings() {
  const { LEAGUE_ID, ESPN_S2, ESPN_SWID, SEASON_YEAR } = process.env;

  if (!LEAGUE_ID || !ESPN_S2 || !ESPN_SWID) {
    throw new Error('Missing LEAGUE_ID, ESPN_S2, or ESPN_SWID environment variable(s).');
  }

  const seasonId = SEASON_YEAR || String(new Date().getFullYear());

  // Step 1: league-wide state -- standings and what week ESPN thinks we're in.
  const overview = await fetchLeague({
    leagueId: LEAGUE_ID,
    seasonId,
    s2: ESPN_S2,
    swid: ESPN_SWID,
    views: ['mTeam', 'mStandings'],
  });

  const currentWeek = overview.status.currentMatchupPeriod;
  // `latestScoringPeriod` tracks the most recently completed week -- that's
  // the one we want box scores for. Falls back to currentWeek if ESPN
  // doesn't return that field for your league.
  const recapWeek = overview.status.latestScoringPeriod || currentWeek;

  const rankings = computePowerRankings(overview);

  // Step 2: box scores / rosters for the week being recapped.
  const boxscoreData = await fetchLeague({
    leagueId: LEAGUE_ID,
    seasonId,
    s2: ESPN_S2,
    swid: ESPN_SWID,
    views: ['mTeam', 'mBoxscore', 'mMatchupScore'],
    scoringPeriodId: recapWeek,
  });

  const matchupAwards = computeMatchupAwards(boxscoreData, recapWeek);
  const { topPerformers, busts } = extractPlayerPerformances(boxscoreData, recapWeek);

  const store = getStore(STORE_NAME);
  const history = (await store.get(HISTORY_KEY, { type: 'json' })) || [];
  const previousSnapshot = history
    .filter((h) => h.week < currentWeek)
    .sort((a, b) => b.week - a.week)[0];

  const { rankings: rankingsWithMovement, recapLines } = buildRecap(
    rankings,
    previousSnapshot ? previousSnapshot.rankings : null
  );

  let aiRecap = null;
  try {
    aiRecap = await generateAiRecap({ matchupAwards, topPerformers, busts, week: recapWeek });
  } catch (err) {
    console.error('AI recap generation failed, falling back to template copy:', err.message);
  }

  const snapshot = {
    week: currentWeek,
    recapWeek,
    generatedAt: new Date().toISOString(),
    rankings: rankingsWithMovement,
    recapLines,
    matchupAwards,
    topPerformers,
    busts,
    aiRecap,
  };

  const historyWithoutThisWeek = history.filter((h) => h.week !== currentWeek);
  historyWithoutThisWeek.push(snapshot);
  historyWithoutThisWeek.sort((a, b) => a.week - b.week);

  await store.setJSON(HISTORY_KEY, historyWithoutThisWeek);
  await store.setJSON(LATEST_KEY, snapshot);

  return snapshot;
}

module.exports = { refreshRankings, STORE_NAME, HISTORY_KEY, LATEST_KEY };
