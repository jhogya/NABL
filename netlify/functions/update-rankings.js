const { refreshRankings } = require('./lib/refresh');

exports.handler = async () => {
  try {
    const snapshot = await refreshRankings();
    console.log(`Rankings updated for week ${snapshot.week}`);
    return { statusCode: 200, body: `Rankings updated for week ${snapshot.week}` };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
};

// Runs every Tuesday at 10:00 UTC (after Monday Night Football, before
// Thursday's slate). Adjust the cron string to fit your league's schedule.
// Cron reference: minute hour day-of-month month day-of-week
exports.config = {
  schedule: '0 10 * * 2',
};
