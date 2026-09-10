const { refreshRankings } = require('./lib/refresh');

// Hit this at /.netlify/functions/refresh-now?key=YOUR_REFRESH_SECRET
// to force an immediate rankings refresh (handy right after MNF ends,
// or while you're testing setup).
exports.handler = async (event) => {
  const providedKey = event.queryStringParameters && event.queryStringParameters.key;

  if (!process.env.REFRESH_SECRET || providedKey !== process.env.REFRESH_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    const snapshot = await refreshRankings();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot, null, 2),
    };
  } catch (err) {
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
};
