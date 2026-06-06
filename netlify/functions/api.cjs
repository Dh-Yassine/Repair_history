const serverless = require('serverless-http');

let handlerFn = null;

function normalizeEvent(event) {
  let reqPath = event.rawPath || event.path;

  if (!reqPath && event.rawUrl) {
    try {
      reqPath = new URL(event.rawUrl, 'https://repair-history.netlify.app').pathname;
    } catch {
      /* ignore */
    }
  }

  if (reqPath && reqPath.includes('/.netlify/functions/')) {
    reqPath = reqPath.replace('/.netlify/functions/api', '') || '/';
  }

  return { ...event, path: reqPath || '/api/health' };
}

async function getHandler() {
  if (!handlerFn) {
    try {
      const { default: app } = await import('../../backend/src/app.js');
      handlerFn = serverless(app, {
        binary: ['image/*', 'application/pdf', 'multipart/form-data'],
      });
    } catch (err) {
      // Surface startup errors clearly
      console.error('Failed to load Express app:', err);
      throw err;
    }
  }
  return handlerFn;
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    const fn = await getHandler();
    return await fn(normalizeEvent(event), context);
  } catch (err) {
    console.error('[api.cjs] handler crash:', err);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: err?.message || 'API function failed to start',
        hint: 'Check Netlify function logs for the full stack trace',
      }),
    };
  }
};
