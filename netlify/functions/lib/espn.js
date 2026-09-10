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
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: `https://fantasy.espn.com/football/league?leagueId=${leagueId}&seasonId=${seasonId}`,
      Origin: 'https://fantasy.espn.com',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'cors',
      'sec-fetch-dest': 'empty',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ESPN API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `ESPN returned a non-JSON response (content-type: ${contentType}). This usually means the ESPN_S2/ESPN_SWID cookies are missing, expired, or malformed. First 200 chars of response: ${body.slice(0, 200)}`
    );
  }

  return res.json();
}

module.exports = { fetchLeague };
