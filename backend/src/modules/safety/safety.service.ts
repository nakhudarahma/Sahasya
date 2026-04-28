import { ReportHotspotDto, Hotspot } from './safety.interface';
import { supabase } from '../../config/supabase.config';

export class SafetyService {
  // ── Report New Hotspot ───────────────────────────────────────────────────
  async reportUnsafeHotspot(userId: string, data: ReportHotspotDto): Promise<Hotspot> {
    try {
      const { data: hotspot, error } = await supabase
        .from('safety_hotspots')
        .insert({
          reported_by: userId,
          label: data.label,
          type: data.type,
          lat: data.lat,
          lng: data.lng,
          radius: data.radius || 50,
          description: data.description || '',
          upvotes: 0,
          verified: false,
        })
        .select()
        .single();

      if (error || !hotspot) {
        throw error || new Error('Failed to insert hotspot');
      }

      return this.mapHotspot(hotspot);
    } catch (err) {
      console.error('Report hotspot failed:', err);
      throw Object.assign(new Error('Failed to report hotspot'), { statusCode: 500, details: err });
    }
  }

  // ── Get All Hotspots (PROXIMITY AWARE) ──────────────────────────────────
  async getNearbyHotspots(lat?: number, lng?: number, filterType?: string): Promise<Hotspot[]> {
    try {
      let query = supabase.from('safety_hotspots').select('*');
      if (filterType && filterType !== 'All') {
        query = query.eq('type', filterType.toLowerCase());
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.warn('⚠️ Supabase Error [Hotspots]:', error.message, '| Reverting to mock data.');
        return this.getMockHotspots(lat, lng, filterType);
      }

      const results = (data || []).map(h => this.mapHotspot(h));
      
      // If lat/lng provided, sort by proximity
      if (lat !== undefined && lng !== undefined) {
        return results
          .map(h => ({ ...h, distance: this.calculateDistance(lat, lng, h.lat, h.lng) }))
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      return results;
    } catch (err) {
      console.warn('⚠️ Unexpected Error [Hotspots]: Returning mock data fallback.', err);
      return this.getMockHotspots(lat, lng, filterType);
    }
  }

  // ── Help Centers (INDESTRUCTIBLE FALLBACK) ────────────────────────────────
  async getHelpCenters(category?: string) {
    try {
      let query = supabase.from('help_centers').select('*');
      if (category && category !== 'All') {
        query = query.eq('category', category.toLowerCase());
      }
      const { data, error } = await query;
      
      if (error) {
         console.warn('⚠️ Supabase Error [HelpCenters]:', error.message, '| Returning empty list.');
         return [];
      }
      return data || [];
    } catch (err) {
       console.warn('⚠️ Unexpected Error [HelpCenters]: Returning empty fallback.', err);
       return [];
    }
  }

  // ── Safety Statistics (INDESTRUCTIBLE FALLBACK) ───────────────────────────
  async getSafetyStats() {
    try {
      const { data, error } = await supabase.from('safety_stats').select('*');
      if (error) {
         console.warn('⚠️ Supabase Error [Stats]:', error.message, '| Returning empty list.');
         return [];
      }
      return data || [];
    } catch (err) {
       console.warn('⚠️ Unexpected Error [Stats]: Returning empty fallback.', err);
       return [];
    }
  }

  // ── Distance Calculation (Haversine) ─────────────────────────────────────
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // ── Fallback Mock Data ──────────────────────────────────────────────────
  private getMockHotspots(ulab?: number, ulng?: number, filter?: string): Hotspot[] {
    const mocks: Hotspot[] = [
      // 📍 MUMBAI / THANE / BHIWANDI (User's Current Region)
      { id: 'f1', label: 'Dharavi', type: 'danger', lat: 19.0437, lng: 72.8527, radius: 600, description: 'Multiple incidents reported. Avoid after dark.', upvotes: 45, verified: true },
      { id: 'f2', label: 'Kurla Junction', type: 'danger', lat: 19.0722, lng: 72.9005, radius: 500, description: 'Poor lighting near railway station.', upvotes: 28, verified: true },
      { id: 'bh1', label: 'Bhiwandi Market St.', type: 'caution', lat: 19.3018, lng: 73.0535, radius: 400, description: 'High congestion area, stay alert for petty thefts.', upvotes: 31, verified: true },
      { id: 'bh2', label: 'Samad Nagar Area', type: 'safe', lat: 19.2980, lng: 73.0500, radius: 500, description: 'Active residential community, well patrolled.', upvotes: 56, verified: true },
      { id: 'th1', label: 'Thane Station East', type: 'danger', lat: 19.1860, lng: 72.9750, radius: 500, description: 'Poorly lit exits, incidents reported at night.', upvotes: 44, verified: true },
      { id: 'th2', label: 'Viviana Mall Hub', type: 'safe', lat: 19.2085, lng: 72.9715, radius: 700, description: '24/7 security, high surveillance safe zone.', upvotes: 210, verified: true },

      // 📍 DELHI (NCR)
      { id: 'd1', label: 'GB Road', type: 'danger', lat: 28.6430, lng: 77.2285, radius: 550, description: 'Highly crowded, high theft and risk reports at night.', upvotes: 89, verified: true },
      { id: 'd2', label: 'Old Delhi / Chandni Chowk', type: 'caution', lat: 28.6608, lng: 77.2333, radius: 450, description: 'Extreme crowds, be alert to valuables.', upvotes: 124, verified: true },
      { id: 'd4', label: 'Lutyens Delhi', type: 'safe', lat: 28.6120, lng: 77.2295, radius: 800, description: 'High security government zone, very safe.', upvotes: 310, verified: true },

      // 📍 BANGALORE
      { id: 'b1', label: 'Majestic Metro Area', type: 'caution', lat: 12.9756, lng: 77.5728, radius: 500, description: 'Very crowded transport hub, watch for pickpockets.', upvotes: 75, verified: true },
      { id: 'b2', label: 'Koramangala 80ft Rd', type: 'safe', lat: 12.9352, lng: 77.6245, radius: 450, description: 'Active nightlife and residential, generally safe.', upvotes: 185, verified: true },

      // 📍 PUNE
      { id: 'p1', label: 'Hinjewadi IT Phase 3', type: 'caution', lat: 18.5813, lng: 73.6889, radius: 750, description: 'Isolated construction stretches, avoid solo travel late.', upvotes: 25, verified: true },
      { id: 'p2', label: 'Kothrud', type: 'safe', lat: 18.5074, lng: 73.8077, radius: 500, description: 'Safe residential area with good community presence.', upvotes: 142, verified: true },

      // 📍 KOLKATA
      { id: 'k1', label: 'Sonagachi Area', type: 'danger', lat: 22.5898, lng: 88.3598, radius: 400, description: 'Avoid after dark, high-risk reported area.', upvotes: 62, verified: true },
      { id: 'k2', label: 'Salt Lake Sector V', type: 'safe', lat: 22.5735, lng: 88.4331, radius: 600, description: 'IT hub with 24/7 activity and security.', upvotes: 145, verified: true },
    ];

    let filtered = mocks;
    if (filter && filter !== 'All') {
      filtered = filtered.filter(m => m.type === filter.toLowerCase());
    }

    if (ulab !== undefined && ulng !== undefined) {
      return filtered
        .map(h => ({ ...h, distance: this.calculateDistance(ulab, ulng, h.lat || 0, h.lng || 0) }))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return filtered;
  }

  // ── Upvote Hotspot ───────────────────────────────────────────────────────
  async upvoteHotspot(userId: string, hotspotId: string): Promise<void> {
    try {
      const { data: current, error: fetchError } = await supabase
        .from('safety_hotspots')
        .select('upvotes')
        .eq('id', hotspotId)
        .single();

      if (fetchError || !current) throw fetchError || new Error('Not found');

      const { error } = await supabase
        .from('safety_hotspots')
        .update({ upvotes: (current.upvotes || 0) + 1 })
        .eq('id', hotspotId);

      if (error) throw error;
    } catch (err) {
      console.error('Upvote failed:', err);
      // We don't throw here to keep map experience smooth, but we could
    }
  }

  // ── Map DB row to interface ──────────────────────────────────────────────
  private mapHotspot(row: any): Hotspot {
    return {
      id: row.id,
      label: row.label,
      type: row.type || 'caution',
      lat: row.lat,
      lng: row.lng,
      radius: row.radius || 50,
      description: row.description || '',
      upvotes: row.upvotes || 0,
      verified: row.verified || false,
    };
  }
}
