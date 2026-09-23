/**
 * Demonstration Time Scale Configuration
 *
 * 1 real second = DEMO_TIME_SCALE simulated seconds.
 * 
 * Example:
 * DEMO_TIME_SCALE = 300 means:
 * 1 real second = 300 simulated seconds (5 simulated minutes).
 * Therefore, a 72-hour real-world SLA window elapses in ~14.4 real minutes during demo.
 *
 * IMPORTANT:
 * Real-world SLA durations (12h, 24h, 72h, 168h) remain 100% intact in database policies.
 * We are ONLY accelerating the passage of time for presentation demonstration.
 */

module.exports = {
  // 1 real second = 300 simulated seconds (5 simulated minutes per second)
  DEMO_TIME_SCALE: 300,

  // Fast-forward increment in minutes for instant testing
  DEMO_STEP_MINUTES: 60
};
