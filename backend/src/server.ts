import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const HOST = process.env['HOST'] ?? '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`[server] Running on http://${HOST}:${PORT}`);
  console.log(`[server] Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
  console.log(`[server] Health check: http://${HOST}:${PORT}/health`);
});

const shutdown = (signal: string): void => {
  console.log(`[server] ${signal} received, shutting down gracefully`);
  server.close(() => {
    console.log('[server] Closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default server;
