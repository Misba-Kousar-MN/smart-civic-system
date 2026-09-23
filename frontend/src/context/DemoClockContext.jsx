import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const DemoClockContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const DemoClockProvider = ({ children }) => {
  const [clockState, setClockState] = useState({
    enabled: false,
    timeScale: 300,
    simulatedMinutesPerRealSecond: 5,
    effectiveNow: Date.now(),
    effectiveIso: new Date().toISOString(),
    realNow: Date.now(),
    offsetMinutes: 0
  });

  const anchorRef = useRef({
    enabled: false,
    timeScale: 300,
    startTimeReal: Date.now(),
    startTimeSimulated: Date.now(),
    offsetMs: 0
  });

  // Fetch authoritative clock state from backend
  const fetchClockStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/demo/clock`);
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        anchorRef.current = {
          enabled: d.enabled,
          timeScale: d.timeScale || 300,
          startTimeReal: Date.now(),
          startTimeSimulated: d.effectiveNow,
          offsetMs: (d.offsetMinutes || 0) * 60000
        };
        setClockState(d);
      }
    } catch (err) {
      // Backend demo clock route may be unavailable or offline; fallback to standard time
    }
  }, []);

  // Poll clock status periodically and initialize on mount
  useEffect(() => {
    fetchClockStatus();
    const pollInterval = setInterval(fetchClockStatus, 15000);
    return () => clearInterval(pollInterval);
  }, [fetchClockStatus]);

  // High-frequency local timer (1 second) to smoothly advance simulated countdown
  useEffect(() => {
    const tickInterval = setInterval(() => {
      const { enabled, timeScale, startTimeReal, startTimeSimulated, offsetMs } = anchorRef.current;
      if (!enabled) {
        setClockState(prev => ({
          ...prev,
          effectiveNow: Date.now(),
          effectiveIso: new Date().toISOString(),
          realNow: Date.now()
        }));
      } else {
        const elapsedRealMs = Date.now() - startTimeReal;
        const elapsedSimMs = elapsedRealMs * timeScale;
        const currentSimMs = startTimeSimulated + elapsedSimMs + offsetMs;
        setClockState(prev => ({
          ...prev,
          effectiveNow: currentSimMs,
          effectiveIso: new Date(currentSimMs).toISOString(),
          realNow: Date.now()
        }));
      }
    }, 1000);

    return () => clearInterval(tickInterval);
  }, []);

  // Toggle demo mode on server
  const toggleDemoClock = async (overrideState, customScale) => {
    try {
      const nextEnabled = overrideState !== undefined ? Boolean(overrideState) : !clockState.enabled;
      const res = await axios.post(`${API_BASE}/demo/clock/toggle`, {
        enabled: nextEnabled,
        timeScale: customScale || 300
      });
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        anchorRef.current = {
          enabled: d.enabled,
          timeScale: d.timeScale || 300,
          startTimeReal: Date.now(),
          startTimeSimulated: d.effectiveNow,
          offsetMs: (d.offsetMinutes || 0) * 60000
        };
        setClockState(d);
      }
    } catch (err) {
      console.error('Failed to toggle demo clock:', err);
    }
  };

  // Jump demo clock forward by minutes
  const advanceDemoClock = async (minutes) => {
    try {
      const res = await axios.post(`${API_BASE}/demo/clock/advance`, { minutes });
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        anchorRef.current = {
          enabled: d.enabled,
          timeScale: d.timeScale || 300,
          startTimeReal: Date.now(),
          startTimeSimulated: d.effectiveNow,
          offsetMs: (d.offsetMinutes || 0) * 60000
        };
        setClockState(d);
      }
    } catch (err) {
      console.error('Failed to advance demo clock:', err);
    }
  };

  // Reset clock back to live real-time
  const resetDemoClock = async () => {
    try {
      const res = await axios.post(`${API_BASE}/demo/clock/reset`);
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        anchorRef.current = {
          enabled: false,
          timeScale: 300,
          startTimeReal: Date.now(),
          startTimeSimulated: Date.now(),
          offsetMs: 0
        };
        setClockState(d);
      }
    } catch (err) {
      console.error('Failed to reset demo clock:', err);
    }
  };

  const getEffectiveNow = useCallback(() => {
    const { enabled, timeScale, startTimeReal, startTimeSimulated, offsetMs } = anchorRef.current;
    if (!enabled) return Date.now();
    const elapsedRealMs = Date.now() - startTimeReal;
    const elapsedSimMs = elapsedRealMs * timeScale;
    return startTimeSimulated + elapsedSimMs + offsetMs;
  }, []);

  const getEffectiveIso = useCallback(() => {
    return new Date(getEffectiveNow()).toISOString();
  }, [getEffectiveNow]);

  return (
    <DemoClockContext.Provider
      value={{
        isDemoClockActive: clockState.enabled,
        timeScale: clockState.timeScale,
        simulatedMinutesPerRealSecond: clockState.simulatedMinutesPerRealSecond || 5,
        effectiveNow: clockState.effectiveNow,
        effectiveIso: clockState.effectiveIso,
        realNow: clockState.realNow,
        offsetMinutes: clockState.offsetMinutes,
        toggleDemoClock,
        advanceDemoClock,
        resetDemoClock,
        getEffectiveNow,
        getEffectiveIso,
        refreshClock: fetchClockStatus
      }}
    >
      {children}
    </DemoClockContext.Provider>
  );
};

export const useDemoClock = () => {
  const context = useContext(DemoClockContext);
  if (!context) {
    return {
      isDemoClockActive: false,
      timeScale: 1,
      simulatedMinutesPerRealSecond: 0,
      effectiveNow: Date.now(),
      effectiveIso: new Date().toISOString(),
      realNow: Date.now(),
      offsetMinutes: 0,
      toggleDemoClock: () => {},
      advanceDemoClock: () => {},
      resetDemoClock: () => {},
      getEffectiveNow: () => Date.now(),
      getEffectiveIso: () => new Date().toISOString(),
      refreshClock: () => {}
    };
  }
  return context;
};
