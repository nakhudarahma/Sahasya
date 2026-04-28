import app from './app';
import { env } from './config/env.config';
import './bot'; // Start the Telegram Bot along with the server

const PORT = env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 SAHAS Backend running on port ${PORT} in ${env.NODE_ENV} mode`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
