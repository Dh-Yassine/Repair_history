import serverless from 'serverless-http';
import app from '../../backend/src/app.js';

const handler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'multipart/form-data'],
});

export { handler };
