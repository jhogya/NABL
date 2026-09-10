// Turns raw ESPN league JSON into a power-rankings table and a short
// weekly recap. Tune the formula and recap copy here.

function teamName(t) {
  const combined = `${t.location || ''} ${t.nickname || ''}`.trim();
  return combined || t.name || `Team ${t.id}`;
}

function computePowerRankings(espnData) {
  const teams = espnData.teams.map((t) => {
    const record = t.record.overall;
    const gamesPlayed = Math.max(1, record.wins + record.losses + record.ties);
    return {
      id: t.id,
      name: teamName(t),
      wins: record.wins,
      losses: record.losses,
      ties: record.ties,
      pointsFor: record.pointsFor,
      pointsAgainst: record.pointsAgainst,
      winPct: record.wins / gamesPlayed,
    };
  });

  const pf = teams.map((t) => t.pointsFor);
  const maxPF = Math.max(...pf);
  const minPF = Math.min(...pf);

  const scored = teams.map((t) => {
    const pfNorm = maxPF === minPF ? 0.5 : (t.pointsFor - minPF) / (maxPF - minPF);
    // 60% record, 40% scoring output — tweak this blend to taste.
    const powerScore = 0.6 * t.winPct + 0.4 * pfNorm;
    return { ...t, powerScore };
  });

  scored.sort((a, b) => b.powerScore - a.powerScore);
  scored.forEach((t, i) => {
    t.rank = i + 1;
  });

  return scored;
}

// Compares this week's rankings to last week's to produce movement
// arrows and a couple of recap lines.
function buildRecap(current, previous) {
  const prevRankById = new Map((previous || []).map((t) => [t.id, t.rank]));

  const withMovement = current.map((t) => {
    const prevRank = prevRankById.get(t.id);
    const movement = prevRank ? prevRank - t.rank : 0; // positive = moved up
    return { ...t, movement, prevRank: prevRank || null };
  });

  const lines = [];

  const biggestRiser = [...withMovement].sort((a, b) => b.movement - a.movement)[0];
  if (biggestRiser && biggestRiser.movement > 0) {
    lines.push(`${biggestRiser.name} is this week's biggest riser, up ${biggestRiser.movement} spot${biggestRiser.movement > 1 ? 's' : ''} to #${biggestRiser.rank}.`);
  }

  const biggestFaller = [...withMovement].sort((a, b) => a.movement - b.movement)[0];
  if (biggestFaller && biggestFaller.movement < 0) {
    lines.push(`${biggestFaller.name} took the biggest tumble, dropping ${Math.abs(biggestFaller.movement)} spot${Math.abs(biggestFaller.movement) > 1 ? 's' : ''} to #${biggestFaller.rank}.`);
  }

  const highestScorer = [...withMovement].sort((a, b) => b.pointsFor - a.pointsFor)[0];
  if (highestScorer) {
    lines.push(`${highestScorer.name} leads the league in points scored so far (${highestScorer.pointsFor.toFixed(1)}).`);
  }

  return { rankings: withMovement, recapLines: lines };
}

module.exports = { computePowerRankings, buildRecap, teamName };
