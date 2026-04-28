// useAuth.js — Backend-integrated auth for Sahasya (Supabase + Express)
import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { supabase } from '../supabase.js';

const SESSION_KEY = 'sahasya_session';
const TOKEN_KEY = 'sahasya_token';

export function useAuth() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    // Validate that token also exists — if no token, clear stale session
    const token = localStorage.getItem(TOKEN_KEY);
    if (saved && !token) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const fetchingRef = useRef(false); // prevent concurrent fetches

  // ── logout (defined early so other callbacks can reference it) ───────────
  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('sahasya_vault_key');
    setUser(null);
  }, []);

  // ── session recovery ───────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    // Prevent concurrent / duplicate fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const data = await api.get('/auth/profile');
      const contacts = await api.get('/auth/contacts');

      const sessionData = {
        ...data,
        emergencyContacts: contacts,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      setUser(sessionData);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      // Note: We no longer call logout() here because api.js handles 401 Unauthorized errors 
      // automatically. If the Render backend is sleeping, it might throw a 503 or Network Error,
      // which should NOT log the user out.
    } finally {
      fetchingRef.current = false;
    }
  }, [logout]);

  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn('Session expired or unauthorized, logging out...');
      logout();
    };

    window.addEventListener('auth_unauthorized', handleUnauthorized);

    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetchProfile();
    }

    return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
  }, [fetchProfile, logout]);

  // Real-time synchronization for profile and contacts
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    const channelName = `auth_sync_${user.id}_${Math.floor(Math.random() * 1000)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          if (isMounted) {
            console.log('🔔 Profile update received via Realtime');
            fetchProfile();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_contacts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          if (isMounted) {
            console.log('🔔 Emergency contacts update received via Realtime');
            fetchProfile();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'telegram_links',
        },
        () => {
          if (isMounted) {
            console.log('🔔 Telegram link update received via Realtime');
            fetchProfile();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`📡 Realtime connected: ${channelName}`);
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchProfile]);

  // ── signup ────────────────────────────────────────────────────────────────
  const signup = useCallback(async (name, email, password, emergencyContacts = []) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        fullName: name,
        email,
        password,
        emergencyContacts: emergencyContacts.map(c => ({ name: c.name, phone: c.phone }))
      });

      if (res.session?.access_token) {
        localStorage.setItem(TOKEN_KEY, res.session.access_token);
        if (res.session.refresh_token) {
          localStorage.setItem('sahasya_refresh_token', res.session.refresh_token);
        }

        const sessionData = {
          ...res.user,
          emergencyContacts: res.emergencyContacts || [],
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        localStorage.setItem('sahasya_vault_key', btoa(password));
        setUser(sessionData);
        return { success: true };
      }
      return { success: false, error: 'Registration failed: No session returned.' };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });

      if (res.session?.access_token) {
        localStorage.setItem(TOKEN_KEY, res.session.access_token);
        if (res.session.refresh_token) {
          localStorage.setItem('sahasya_refresh_token', res.session.refresh_token);
        }

        const sessionData = {
          ...res.user,
          emergencyContacts: res.emergencyContacts || [],
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        localStorage.setItem('sahasya_vault_key', btoa(password));
        setUser(sessionData);
        return { success: true };
      }
      return { success: false, error: 'Login failed: No session returned.' };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── update features ───────────────────────────────────────────────────────
  const updateEmergencyContacts = useCallback(async (newContacts) => {
    try {
      const updated = await api.post('/auth/contacts', {
        contacts: newContacts.map(c => ({ name: c.name, phone: c.phone }))
      });

      setUser(prev => {
        const updatedSession = { ...prev, emergencyContacts: updated };
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
        return updatedSession;
      });
      return true;
    } catch (err) {
      console.error('Update contacts failed:', err);
      if (err.message?.includes('session has expired') || err.message?.includes('Unauthorized')) {
        logout();
      }
      return false;
    }
  }, [logout]);

  const updateProfile = useCallback(async (data) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      logout();
      return false;
    }

    // Merge personalInfo if provided to prevent overwriting other fields
    const mergedData = { ...data };
    if (data.personalInfo) {
      mergedData.personalInfo = {
        ...(userRef.current?.personalInfo || {}),
        ...data.personalInfo
      };
    }

    try {
      const res = await api.patch('/auth/profile', mergedData);

      setUser(prev => {
        // Correctly merge the returned user object and emergency contacts
        const updatedSession = {
          ...prev,
          ...res.user,
          emergencyContacts: res.emergencyContacts || prev.emergencyContacts
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
        return updatedSession;
      });
      return true;
    } catch (err) {
      console.error('Update profile failed:', err);
      if (err.message?.includes('session has expired') || err.message?.includes('Unauthorized')) {
        logout();
      }
      return false;
    }
  }, [logout]);

  const completeOnboarding = useCallback(async (info) => {
    const { fullName, mobileNumber, emergencyContactName, emergencyContactPhone, ...personalInfo } = info;

    // 1. Update the primary profile details
    const profileSuccess = await updateProfile({
      onboardingCompleted: true,
      fullName,
      phone: mobileNumber,
      personalInfo
    });

    if (!profileSuccess) return false;

    // 2. Synchronize the primary emergency contact to the contacts table
    if (emergencyContactName && emergencyContactPhone) {
      await updateEmergencyContacts([{
        name: emergencyContactName,
        phone: emergencyContactPhone
      }]);
    }

    return true;
  }, [updateProfile, updateEmergencyContacts]);

  const updatePersonalInfo = useCallback((personalInfo) => {
    return updateProfile({ personalInfo });
  }, [updateProfile]);

  const verifyPassword = useCallback(async (password) => {
    try {
      // PWA App Lock implementation: prevent Supabase 'signInWithPassword' rate limits
      // by verifying against the securely saved session key established at login.
      const savedKey = localStorage.getItem('sahasya_vault_key');
      if (savedKey && savedKey === btoa(password)) {
        return true;
      }

      // Fallback to backend validation if key is missing (happens on legacy sessions)
      const res = await api.post('/auth/verify-password', { password });
      if (res.isValid === true) {
        localStorage.setItem('sahasya_vault_key', btoa(password));
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  }, []);

  return {
    user,
    loading,
    login,
    signup,
    logout,
    updateEmergencyContacts,
    updateProfile,
    completeOnboarding,
    updatePersonalInfo,
    verifyPassword,
    isLoggedIn: !!user
  };
}
