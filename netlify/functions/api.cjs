// Prisma requires DIRECT_URL — fall back to DATABASE_URL if not set in Netlify env vars
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const serverless = require('serverless-http');

let handlerFn = null;

function normalizeEvent(event) {
  let reqPath = event.rawPath || event.path;

  if (!reqPath && event.rawUrl) {
    try {
      reqPath = new URL(event.rawUrl, 'https://repair-history.netlify.app').pathname;
    } catch { /* ignore */ }
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
      console.error('[api.cjs] Failed to load Express app:', err);
      throw err;
    }
  }
  return handlerFn;
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    // Ensure JSON bodies are plain strings for serverless-http → Express
    if (event.isBase64Encoded && typeof event.body === 'string') {
      event = {
        ...event,
        body: Buffer.from(event.body, 'base64').toString('utf8'),
        isBase64Encoded: false,
      };
    }
    if (event.body == null) {
      event = { ...event, body: '' };
    }
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
