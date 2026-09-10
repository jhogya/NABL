// Generates a short, personality-filled weekly recap paragraph using the
// Anthropic API. Requires your own ANTHROPIC_API_KEY (from
// console.anthropic.com — separate from a claude.ai login) set as a
// Netlify environment variable. If it's not set, refresh.js falls back
// to the templated bullet-point recap instead.

const MODEL = 'claude-sonnet-5';

function buildPrompt({ matchupAwards, topPerformers, busts, week }) {
  const matchupLines = matchupAwards.matchups
    .map(
      (m) =>
        `${m.awayTeam} ${m.awayScore.toFixed(1)} @ ${m.homeTeam} ${m.homeScore.toFixed(1)} — ${m.winner} won by ${m.margin.toFixed(1)}`
    )
    .join('\n');

  const performerLines = topPerformers
    .map((p) => `${p.name} (${p.position}, ${p.team}): ${p.actual.toFixed(1)} pts`)
    .join('\n');

  const bustLines = busts
    .map(
      (p) =>
        `${p.name} (${p.position}, ${p.team}): ${p.actual.toFixed(1)} actual vs ${p.projected.toFixed(1)} projected`
    )
    .join('\n');

  return `You are writing a fun, punchy weekly recap for a private fantasy football league's website. Week ${week} results:

MATCHUPS:
${matchupLines}

TOP PERFORMERS:
${performerLines}

BIGGEST BUSTS:
${bustLines}

Write a short recap (250-350 words) with personality and light trash talk. Structure: a one-line headline, then a couple short paragraphs covering the closest game, the biggest blowout, and standout performances (both great and disappointing). Use only the team/player names and numbers given above — don't invent stats. Keep it fun for a group chat with friends, playful rather than mean.`;
}

async function generateAiRecap({ matchupAwards, topPerformers, busts, week }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt({ matchupAwards, topPerformers, busts, week }) }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  return text.trim();
}

module.exports = { generateAiRecap };
