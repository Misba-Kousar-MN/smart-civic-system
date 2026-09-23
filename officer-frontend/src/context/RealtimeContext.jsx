import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../config/supabase';

const RealtimeContext = createContext();

export const RealtimeProvider = ({ children }) => {
  const [lastEvent, setLastEvent] = useState(null);
  // Track the last event key to suppress duplicate fires for the same row+timestamp
  const lastKeyRef = useRef(null);

  useEffect(() => {
    const handleChange = (table, payload) => {
      const rowId = payload.new?.id || payload.old?.id || 'unknown';
      const ts = payload.new?.updated_at || payload.new?.created_at || payload.commit_timestamp || '';
      const eventKey = `${table}:${payload.eventType}:${rowId}:${ts}`;

      // Suppress duplicate callbacks for the same logical event
      if (eventKey === lastKeyRef.current) return;
      lastKeyRef.current = eventKey;

      setLastEvent({ table, event: payload.eventType, data: payload.new, key: eventKey });
    };

    const channel = supabase
      .channel('officer-realtime-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => handleChange('incidents', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'escalations' },
        (payload) => handleChange('escalations', payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ lastEvent }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);

