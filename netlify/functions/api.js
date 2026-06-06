import serverless from 'serverless-http';

let handlerFn = null;

async function getHandler() {
  if (!handlerFn) {
    const { default: app } = await import('../../backend/src/app.js');
    handlerFn = serverless(app, {
      binary: ['image/*', 'application/pdf', 'multipart/form-data'],
    });
  }
  return handlerFn;
}

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    const fn = await getHandler();
    return await fn(event, context);
  } catch (err) {
    console.error('Netlify API function failed:', err);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err?.message || 'API function failed to start' }),
    };
  }
}
