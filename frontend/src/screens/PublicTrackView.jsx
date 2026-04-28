import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase.js';
import { GoogleMap, Marker, useGoogleMaps, DARK_MAP_STYLE, MapPlaceholder } from '../components/GoogleMapProvider.jsx';

const containerStyle = { width: '100%', height: '100%' };

export default function PublicTrackView({ shareCode }) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [session, setSession] = useState(null);
  const [userName, setUserName] = useState('User');
  const [userLocation, setUserLocation] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    let channel = null;

    async function fetchSession() {
      // 1. Find the session by share_link containing the code (get the most recent if duplicates exist)
      const { data: sessions, error: sessError } = await supabase
        .from('tracking_sessions')
        .select('*')
        .filter('share_link', 'ilike', `%${shareCode}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (sessError || !sessions || sessions.length === 0) {
        console.error('Session lookup failed:', sessError);
        setError('Tracking link is invalid or has been permanently deleted.');
        return;
      }

      const data = sessions[0];

      // 3. Check if session is older than 2 hours (Security limit)
      const created = new Date(data.created_at);
      const hoursOld = (Date.now() - created.getTime()) / (1000 * 60 * 60);
      if (hoursOld > 2) {
        setIsExpired(true);
        setError('This tracking link has expired (2 hour limit).');
        return;
      }

      setSession(data);
      if (!data.is_active) {
        setIsExpired(true); // Tag it as ended so UI can show "Last Known Location"
      }

      // 2. Fetch initial profile data (name + location)
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_location, location_updated_at, full_name')
        .eq('id', data.user_id)
        .single();
      
      if (profile?.full_name) setUserName(profile.full_name);
      if (profile?.last_location) {
        setUserLocation(profile.last_location);
        setLastUpdated(profile.location_updated_at);
      }

      // 3. Subscribe to real-time location updates
      channel = supabase
        .channel(`public_track_${data.user_id}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${data.user_id}`,
          },
          (payload) => {
            if (payload.new.last_location) {
              const loc = payload.new.last_location;
              setUserLocation(loc);
              setLastUpdated(payload.new.location_updated_at || new Date().toISOString());
              
              // Pan map to new location
              if (mapRef.current) {
                mapRef.current.panTo(loc);
              }
            }
          }
        )
        .subscribe();
    }

    fetchSession();

    // Cleanup
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [shareCode]);

  // Expired / Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center p-6 text-center">
        <span className="text-6xl mb-4">{isExpired ? '✅' : '❌'}</span>
        <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
          {isExpired ? 'Tracking Ended' : 'Link Invalid'}
        </h2>
        <p className="text-gray-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>{error}</p>
      </div>
    );
  }

  // Loading state
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>Loading tracking session...</p>
      </div>
    );
  }

  const timeAgo = lastUpdated
    ? `${Math.max(0, Math.round((Date.now() - new Date(lastUpdated).getTime()) / 1000))}s ago`
    : 'Waiting for GPS...';

  return (
    <div className="fixed inset-0 bg-[#0D0D0D] flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-[#0D0D0D]/95 backdrop-blur-md z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`${isExpired ? 'text-green-400' : 'text-red-400'} font-extrabold text-lg uppercase tracking-tight italic`}>
              Sahasya {isExpired ? 'Resolved' : 'Live'}
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">
              {isExpired ? 'SOS Session Ended' : 'Emergency Tracking Active'}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full ${isExpired ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'} flex items-center gap-2`}>
            <span className={`w-2 h-2 rounded-full ${isExpired ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
            <span className={`text-[10px] font-bold ${isExpired ? 'text-green-400' : 'text-red-400'} uppercase`}>
              {isExpired ? 'Last Known' : 'Live'}
            </span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {!isLoaded ? (
          <MapPlaceholder loadError={loadError} />
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={userLocation || { lat: 19.076, lng: 72.877 }}
            zoom={16}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
              styles: DARK_MAP_STYLE
            }}
            onLoad={(map) => { mapRef.current = map; }}
          >
            {userLocation && (
              <Marker
                position={userLocation}
                type="user"
                zIndex={1000}
              />
            )}
          </GoogleMap>
        )}

        {/* Floating Info Card */}
        <div className="absolute bottom-6 left-4 right-4">
          <div className="bg-[#1A1A1A]/95 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-2xl">
                🆘
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Tracking</p>
                <p className="text-lg font-bold text-white">{userName}</p>
                <div className="flex items-center gap-2 mt-1">
                  {userLocation ? (
                    <>
                      <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-gray-400' : 'bg-green-400 animate-pulse'}`} />
                      <span className={`text-xs ${isExpired ? 'text-gray-400' : 'text-green-400'}`}>
                        {isExpired ? 'Last known position' : 'Location active'} · {timeAgo}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                      <span className="text-xs text-yellow-400">Waiting for GPS signal...</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {userLocation && (
              <button 
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${userLocation.lat},${userLocation.lng}`)}
                className="w-full py-3.5 rounded-xl bg-red-500 text-white font-bold text-sm uppercase tracking-widest shadow-xl"
              >
                Get Directions
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
