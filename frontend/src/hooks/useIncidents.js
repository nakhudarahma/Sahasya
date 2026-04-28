import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { supabase } from '../supabase.js';

export const useIncidents = (user, domain = 'vault') => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchIncidents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const endpoint = domain === 'reports' ? '/reports/my-reports' : '/evidence';
      const data = await api.get(endpoint);
      console.log(`📥 Raw Data [${domain}]:`, data);
      
      // Normalize backend data to frontend format
      const normalized = data.map(item => ({
        id: item.id,
        date: item.date || item.created_at || item.incident_date || new Date().toISOString(),
        location: item.location_name || item.location || 'Unknown Location',
        type: item.type || (domain === 'reports' ? 'Manual Report' : 'SOS Alert'),
        durationSeconds: item.duration_seconds || 0,
        summary: item.summary || item.description || 'No description provided.',
        timeline: item.timeline || [],
        evidence: {
          notes: item.notes || '',
          mediaCount: item.media_count || 0
        }
      }));
      
      console.log(`✅ Normalized [${domain}]:`, normalized);
      
      // Sort by date newest first
      const sorted = normalized.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setIncidents(sorted);
    } catch (err) {
      console.error(`Failed to fetch ${domain}:`, err);
    } finally {
      setLoading(false);
    }
  }, [user, domain]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Real-time synchronization
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    const table = domain === 'reports' ? 'reports' : 'incidents';
    const channelName = `${table}_sync_${user.id}_${Math.floor(Math.random() * 1000)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (isMounted) {
            console.log(`🔔 Real-time ${payload.eventType} event received:`, payload);
            fetchIncidents();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, domain, fetchIncidents]);

  const saveIncident = async (payload) => {
    try {
      const endpoint = domain === 'reports' ? '/reports/submit' : '/evidence';
      const res = await api.post(endpoint, payload);
      
      // Refresh list
      fetchIncidents();
      return res;
    } catch (err) {
      console.error('Failed to save incident:', err);
      throw err;
    }
  };

  const deleteIncident = async (id) => {
    try {
      const endpoint = domain === 'reports' ? `/reports/${id}` : `/evidence/${id}`;
      await api.delete(endpoint);
      setIncidents(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error('Failed to delete incident:', err);
    }
  };

  const getIncidentById = (id) => {
    return incidents.find(i => i.id === id) || null;
  };

  return { incidents, loading, saveIncident, deleteIncident, getIncidentById, refresh: fetchIncidents };
};
