# League Power Rankings (Fantasy Genius-style, ESPN edition)

A weekly power-rankings + recap site for your private ESPN league (77297),
built to run on Netlify. It pulls your league data server-side (so your
ESPN login cookies never touch the browser), computes a power ranking
each week, and auto-refreshes every Tuesday morning.

## How it works

- `netlify/functions/update-rankings.js` — scheduled function, runs every
  Tuesday at 10:00 UTC, pulls fresh data from ESPN, computes rankings,
  and stores the result in Netlify Blobs.
- `netlify/functions/refresh-now.js` — same logic, but triggered manually
  by hitting a URL with a secret key. Useful for testing or forcing an
  early update.
- `netlify/functions/get-rankings.js` — read-only endpoint the frontend
  calls to display the latest snapshot + history.
- `public/index.html` — the page people actually look at.

## 1. Get your ESPN cookies (one-time, do this yourself — don't share these with anyone including me)

Because your league is private, ESPN's API needs two cookie values from
a browser session where you're logged into ESPN Fantasy:

1. Log into your league at fantasy.espn.com in Chrome or Firefox.
2. Open DevTools (F12) → **Application** tab (Chrome) or **Storage** tab
   (Firefox) → **Cookies** → `https://fantasy.espn.com`.
3. Find and copy the values for:
   - `espn_s2` (a long string)
   - `SWID` (looks like `{XXXXXXXX-XXXX-...}`, keep the curly braces)

Keep these private — anyone with them can access your ESPN account's
fantasy data.

## 2. Deploy to Netlify

1. Push this folder to a new GitHub repo.
2. In Netlify: **Add new site → Import an existing project**, connect
   the repo.
3. Build settings: publish directory `public`, functions directory
   `netlify/functions` (already set in `netlify.toml`, so defaults
   should just work).
4. Under **Site configuration → Environment variables**, add:

   | Key | Value |
   |---|---|
   | `LEAGUE_ID` | `77297` |
   | `ESPN_S2` | *(your espn_s2 cookie value)* |
   | `ESPN_SWID` | *(your SWID cookie value, including `{}`)* |
   | `SEASON_YEAR` | `2026` |
   | `REFRESH_SECRET` | *(any random string you make up)* |
   | `ANTHROPIC_API_KEY` | *(optional — your own key from console.anthropic.com, not your claude.ai login)* |

   Without `ANTHROPIC_API_KEY`, the site still works — it just shows the
   templated bullet-point recap instead of an AI-written paragraph.

5. Deploy. Netlify will pick up the scheduled function automatically
   from the `exports.config = { schedule: ... }` in
   `update-rankings.js` — no extra setup needed on newer Netlify
   accounts. (If your account predates scheduled functions being
   default-on, enable "Scheduled Functions" under Site configuration →
   Functions.)

## 3. Generate your first snapshot

Rankings won't appear until a snapshot exists. Trigger one manually by
visiting:

```
https://YOUR-SITE.netlify.app/.netlify/functions/refresh-now?key=YOUR_REFRESH_SECRET
```

You should get back a JSON snapshot. Then load the homepage — it should
populate.

## What's on the site now

Each week you refresh, the site stores a full snapshot: power rankings,
closest game, biggest blowout, top 5 performers, top 5 disappointments
(actual points well below projection), and a recap (AI-written if you've
set `ANTHROPIC_API_KEY`, templated bullets if not). The homepage has a
week picker across the top so you can flip back through every past week,
not just the latest.

## If player data looks wrong (top performers / busts)

ESPN's player and box-score fields (`rosterForCurrentScoringPeriod`,
`stats`, `statSourceId`, `lineupSlotId`, position IDs) come from their
*unofficial* API and aren't documented — they've shifted before and could
again. If `topPerformers` or `busts` come back empty or look off after
your first real refresh:

1. Check the function logs for `refresh-now` / `update-rankings` in the
   Netlify dashboard.
2. Temporarily add `console.log(JSON.stringify(boxscoreData.schedule[0], null, 2))`
   near the top of `refreshRankings()` in `lib/refresh.js`, redeploy, hit
   `refresh-now` again, and look at the actual shape of one matchup.
3. Adjust the field paths in `netlify/functions/lib/matchups.js`
   (`getPointsBySource`, the `POSITION_MAP`, or the slot IDs) to match
   what you see.

## Tuning it to taste

- **Ranking formula**: edit `computePowerRankings` in
  `netlify/functions/lib/rankings.js`. It's currently 60% win
  percentage + 40% normalized points-for. Common alternatives: factor
  in schedule strength, or a "luck" score based on how many points a
  team would've scored against an average opponent.
- **Recap copy**: edit `buildRecap` in the same file — right now it
  calls out biggest riser, biggest faller, and top scorer. Easy to add
  more (closest game, highest single-week score, longest win streak).
- **Cron timing**: change the cron string in
  `update-rankings.js` if you want it to run at a different time.
- **Look and feel**: `public/index.html` is a single self-contained
  file — colors, layout, and copy are all in there.

## Extending later

- Weekly matchup recaps (not just power rankings) would need the
  `mMatchup` and `mBoxscore` ESPN views added to `fetchLeague`'s
  `views` array, plus a bit more parsing.
- If you want AI-written recap paragraphs instead of the templated
  lines, the cleanest spot is inside `refresh.js` — send the computed
  stats to Claude via the API and store the generated text alongside
  the snapshot.
