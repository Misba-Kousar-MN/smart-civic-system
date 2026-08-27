import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import client from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (sessionUser) => {
    if (!sessionUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (error || !profile) {
        // Fallback default officer profile if database record hasn't synced
        setUser({
          id: sessionUser.id,
          email: sessionUser.email,
          full_name: sessionUser.user_metadata?.full_name || 'Municipal Officer',
          role: 'ward_officer',
          trust_score: 100
        });
      } else {
        if (profile.role === 'citizen') {
          try {
            await client.post('/profile/provision-officer', { role: 'ward_officer' });
            profile.role = 'ward_officer';
          } catch (pErr) {
            console.warn('[OFFICER AUTO-PROVISION] Warning:', pErr);
          }
        }
        setUser({
          id: sessionUser.id,
          email: sessionUser.email,
          ...profile,
          role: profile.role === 'citizen' ? 'ward_officer' : profile.role
        });
      }
    } catch (err) {
      console.warn('[OFFICER AUTH] Error loading profile:', err);
      setUser({
        id: sessionUser.id,
        email: sessionUser.email,
        role: 'ward_officer'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchProfile(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      fetchProfile(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw error;
    }

    // Check profile role; auto-provision officer role if profile role is citizen
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!profile || profile.role === 'citizen') {
      try {
        await client.post('/profile/provision-officer', { role: 'ward_officer' });
      } catch (e) {
        console.warn('[OFFICER AUTH] Auto-provision warning:', e);
      }
    }

    await fetchProfile(data.user);
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
