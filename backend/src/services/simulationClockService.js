/**
 * Smart Civic System — Simulation Clock Service
 * Provides a controlled, server-authoritative time abstraction.
 *
 * In normal operation (demo mode OFF):
 * Returns real server time (Date.now()).
 *
 * In demonstration mode (demo mode ON):
 * Advances time according to the configured DEMO_TIME_SCALE (e.g. 5 simulated minutes per real second),
 * allowing genuine SLA breach and escalation lifecycles to be demonstrated without altering
 * real-world SLA durations (12h, 24h, 72h, etc.).
 */

const { DEMO_TIME_SCALE, DEMO_STEP_MINUTES } = require('../config/demoTimeConfig');

class SimulationClockService {
  constructor() {
    this.enabled = false;
    this.timeScale = DEMO_TIME_SCALE;
    this.startTimeReal = Date.now();
    this.startTimeSimulated = Date.now();
    this.offsetMs = 0;
  }

  /**
   * Get effective current timestamp (in ms)
   */
  getEffectiveNow() {
    if (!this.enabled) {
      return Date.now();
    }
    const elapsedRealMs = Date.now() - this.startTimeReal;
    const elapsedSimMs = elapsedRealMs * this.timeScale;
    return this.startTimeSimulated + elapsedSimMs + this.offsetMs;
  }

  /**
   * Get effective current time as ISO-8601 string
   */
  getEffectiveIso() {
    return new Date(this.getEffectiveNow()).toISOString();
  }

  /**
   * Toggle or set demo mode state
   * @param {boolean} enable - Whether demo accelerated clock should run
   * @param {number} [customScale] - Optional override for time scale factor
   */
  setDemoMode(enable, customScale) {
    const shouldEnable = Boolean(enable);
    if (shouldEnable && !this.enabled) {
      this.startTimeReal = Date.now();
      this.startTimeSimulated = Date.now();
      this.offsetMs = 0;
      this.timeScale = customScale && customScale > 0 ? customScale : DEMO_TIME_SCALE;
      this.enabled = true;
      console.log(`[SIM_CLOCK] Accelerated Demo Clock ACTIVATED (Scale: ${this.timeScale}x / ${this.timeScale / 60}m per sec)`);
    } else if (!shouldEnable && this.enabled) {
      this.enabled = false;
      this.offsetMs = 0;
      console.log(`[SIM_CLOCK] Accelerated Demo Clock DEACTIVATED (Returned to Real-Time)`);
    } else if (shouldEnable && customScale) {
      // Re-anchor to current effective time before adjusting scale
      const currentSim = this.getEffectiveNow();
      this.startTimeReal = Date.now();
      this.startTimeSimulated = currentSim;
      this.offsetMs = 0;
      this.timeScale = customScale;
    }
    return this.getStatus();
  }

  /**
   * Manually advance simulated time by a number of minutes
   * Useful for testing or rapid presentation progression
   */
  advanceTime(minutes = DEMO_STEP_MINUTES) {
    const mins = Number(minutes) || DEMO_STEP_MINUTES;
    this.offsetMs += mins * 60 * 1000;
    console.log(`[SIM_CLOCK] Advanced simulated time by ${mins} minutes. Effective now: ${this.getEffectiveIso()}`);
    return this.getStatus();
  }

  /**
   * Reset simulation clock back to current real time
   */
  reset() {
    this.startTimeReal = Date.now();
    this.startTimeSimulated = Date.now();
    this.offsetMs = 0;
    console.log(`[SIM_CLOCK] Simulation Clock Reset to real current time.`);
    return this.getStatus();
  }

  /**
   * Get current simulation clock status
   */
  getStatus() {
    const effectiveNow = this.getEffectiveNow();
    const realNow = Date.now();
    return {
      enabled: this.enabled,
      timeScale: this.timeScale,
      simulatedMinutesPerRealSecond: this.timeScale / 60,
      effectiveNow,
      effectiveIso: new Date(effectiveNow).toISOString(),
      realNow,
      realIso: new Date(realNow).toISOString(),
      offsetMinutes: Math.round(this.offsetMs / 60000)
    };
  }
}

// Export singleton instance across backend
module.exports = new SimulationClockService();
