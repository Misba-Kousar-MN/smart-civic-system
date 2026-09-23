const simulationClockService = require('../services/simulationClockService');
const env = require('../config/env');

/**
 * Guard: reject if demo mode is not enabled in this environment
 */
function requireDemoMode(res) {
  if (!env.DEMO_MODE_ENABLED) {
    res.status(403).json({
      success: false,
      error: { code: 'DEMO_MODE_DISABLED', message: 'Demo clock is disabled in this environment.' }
    });
    return false;
  }
  return true;
}

/**
 * Get current simulation clock state
 */
async function getClockStatus(req, res) {
  if (!requireDemoMode(res)) return;
  const status = simulationClockService.getStatus();
  return res.status(200).json({
    success: true,
    data: status
  });
}

/**
 * Toggle simulation clock ON or OFF
 * Body: { enabled: boolean, timeScale?: number }
 */
async function toggleClock(req, res) {
  if (!requireDemoMode(res)) return;
  const { enabled, timeScale } = req.body;
  const status = simulationClockService.setDemoMode(enabled, timeScale);
  return res.status(200).json({
    success: true,
    data: status,
    message: status.enabled
      ? `Demo clock enabled (${status.simulatedMinutesPerRealSecond} sim-min/real-sec).`
      : 'Demo clock disabled. Restored to real-world server time.'
  });
}

/**
 * Advance simulated time by specified minutes
 * Body: { minutes?: number }
 */
async function advanceClock(req, res) {
  if (!requireDemoMode(res)) return;
  const { minutes } = req.body;
  const status = simulationClockService.advanceTime(minutes);
  return res.status(200).json({
    success: true,
    data: status,
    message: `Advanced simulated time by ${minutes || 60} minutes.`
  });
}

/**
 * Reset simulation clock
 */
async function resetClock(req, res) {
  if (!requireDemoMode(res)) return;
  const status = simulationClockService.reset();
  return res.status(200).json({
    success: true,
    data: status,
    message: 'Simulation clock reset.'
  });
}

module.exports = {
  getClockStatus,
  toggleClock,
  advanceClock,
  resetClock
};
