import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (retryCount = 0) => {
    try {
      const response = await authApi.getMyProfile();
      if (response?.success && response?.data) {
        setUser(response.data);
        return response.data;
      }
    } catch (err) {
      console.warn('[AUTH] Error fetching profile:', err);
      // If newly registered, wait 300ms and retry once to allow PostgreSQL trigger execution
      if (retryCount < 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return fetchUserProfile(retryCount + 1);
      }
      setUser(null);
    }
  };

  useEffect(() => {
    // Listen to Supabase Auth state changes (handles INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      if (currentSession) {
        await fetchUserProfile();
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data?.session) {
      setSession(data.session);
      await fetchUserProfile();
    }
    return data;
  };

  const register = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    if (error) throw error;
    if (data?.session) {
      setSession(data.session);
      await fetchUserProfile();
    }
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        login,
        register,
        logout,
        refreshProfile: fetchUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
