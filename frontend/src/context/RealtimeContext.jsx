import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const RealtimeContext = createContext(null);

export const RealtimeProvider = ({ children }) => {
  const { user } = useAuth();
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    if (!user) return;

    // Subscriptions matching docs/REALTIME_EVENTS.md
    const notifChannel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setLastEvent({ table: 'notifications', payload });
        }
      )
      .subscribe();

    const incidentChannel = supabase
      .channel('public-incidents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          setLastEvent({ table: 'incidents', payload });
        }
      )
      .subscribe();

    const escalationChannel = supabase
      .channel('public-escalations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'escalations' },
        (payload) => {
          setLastEvent({ table: 'escalations', payload });
        }
      )
      .subscribe();

    const resolutionChannel = supabase
      .channel('public-resolution-evidence')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'resolution_evidence' },
        (payload) => {
          setLastEvent({ table: 'resolution_evidence', payload });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(incidentChannel);
      supabase.removeChannel(escalationChannel);
      supabase.removeChannel(resolutionChannel);
    };
  }, [user]);

  return (
    <RealtimeContext.Provider value={{ lastEvent }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
