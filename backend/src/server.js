const app = require('./app');
const env = require('./config/env');

const server = app.listen(env.PORT, () => {
  console.log(`============================================================`);
  console.log(`  Smart Civic System — Backend API running`);
  console.log(`  Environment: ${env.NODE_ENV}`);
  console.log(`  Listening on: http://localhost:${env.PORT}/api/v1`);
  console.log(`============================================================`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[FATAL] Unhandled Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
});

module.exports = server;
