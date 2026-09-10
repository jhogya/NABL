const { getStore } = require('@netlify/blobs');
const { STORE_NAME, HISTORY_KEY, LATEST_KEY } = require('./lib/refresh');

exports.handler = async () => {
  const store = getStore(STORE_NAME);
  const latest = await store.get(LATEST_KEY, { type: 'json' });
  const history = await store.get(HISTORY_KEY, { type: 'json' });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
    body: JSON.stringify({ latest: latest || null, history: history || [] }),
  };
};
