import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

const RealtimeContext = createContext();

export const RealtimeProvider = ({ children }) => {
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    const channel = supabase
      .channel('officer-realtime-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          setLastEvent({ table: 'incidents', event: payload.eventType, data: payload.new });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'escalations' },
        (payload) => {
          setLastEvent({ table: 'escalations', event: payload.eventType, data: payload.new });
        }
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
