const app = require('./app');
const env = require('./config/env');

const incidentService = require('./services/incidentService');

const server = app.listen(env.PORT, () => {
  console.log(`============================================================`);
  console.log(`  Smart Civic System — Backend API running`);
  console.log(`  Environment: ${env.NODE_ENV}`);
  console.log(`  Listening on: http://localhost:${env.PORT}/api/v1`);
  console.log(`============================================================`);

  // Automatic SLA Breach Audit Timer — runs every 30 seconds
  setInterval(async () => {
    try {
      const res = await incidentService.checkAndEscalateSlaBreaches();
      if (res.escalated_count > 0) {
        console.log(`[SLA_AUDIT] Automatically escalated ${res.escalated_count} SLA-breached incidents to higher officer levels.`);
      }
    } catch (err) {
      console.warn('[SLA_AUDIT] Background audit error:', err.message);
    }
  }, 30000);
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
