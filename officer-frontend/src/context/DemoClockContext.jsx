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
      console.warn('Failed to toggle simulation clock:', err);
    }
  };

  // Fast forward simulated time
  const advanceDemoClock = async (minutes = 60) => {
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
      console.warn('Failed to advance simulation clock:', err);
    }
  };

  // Reset simulation clock
  const resetDemoClock = async () => {
    try {
      const res = await axios.post(`${API_BASE}/demo/clock/reset`);
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        anchorRef.current = {
          enabled: d.enabled,
          timeScale: d.timeScale || 300,
          startTimeReal: Date.now(),
          startTimeSimulated: d.effectiveNow,
          offsetMs: 0
        };
        setClockState(d);
      }
    } catch (err) {
      console.warn('Failed to reset simulation clock:', err);
    }
  };

  const getEffectiveNow = useCallback(() => {
    if (!anchorRef.current.enabled) return Date.now();
    const elapsedRealMs = Date.now() - anchorRef.current.startTimeReal;
    const elapsedSimMs = elapsedRealMs * anchorRef.current.timeScale;
    return anchorRef.current.startTimeSimulated + elapsedSimMs + anchorRef.current.offsetMs;
  }, []);

  return (
    <DemoClockContext.Provider
      value={{
        ...clockState,
        isDemoClockActive: clockState.enabled,
        toggleDemoClock,
        advanceDemoClock,
        resetDemoClock,
        getEffectiveNow,
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
    // Return graceful fallback if provider is missing
    return {
      isDemoClockActive: false,
      effectiveNow: Date.now(),
      effectiveIso: new Date().toISOString(),
      getEffectiveNow: () => Date.now(),
      toggleDemoClock: () => {},
      advanceDemoClock: () => {},
      resetDemoClock: () => {}
    };
  }
  return context;
};
