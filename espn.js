// Thin wrapper around ESPN's unofficial Fantasy Football API.
// Private leagues require the espn_s2 and SWID cookie values from a
// logged-in browser session. These must be stored as Netlify environment
// variables (ESPN_S2, ESPN_SWID) and NEVER committed to the repo or sent
// to the browser.

const BASE = 'https://fantasy.espn.com/apis/v3/games/ffl/seasons';

async function fetchLeague({ leagueId, seasonId, s2, swid, views, scoringPeriodId }) {
  const viewParams = views.map((v) => `view=${v}`).join('&');
  const periodParam = scoringPeriodId ? `&scoringPeriodId=${scoringPeriodId}` : '';
  const url = `${BASE}/${seasonId}/segments/0/leagues/${leagueId}?${viewParams}${periodParam}`;

  const res = await fetch(url, {
    headers: {
      Cookie: `espn_s2=${s2}; SWID=${swid}`,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ESPN API error ${res.status}: ${body.slice(0, 300)}`);
  }

  return res.json();
}

module.exports = { fetchLeague };
