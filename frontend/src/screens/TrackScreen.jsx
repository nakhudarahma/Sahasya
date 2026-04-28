import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Toast } from '../components/UI.jsx';
import { supabase } from '../supabase.js';
import { GoogleMap, Marker, Polyline, Autocomplete, useGoogleMaps, DARK_MAP_STYLE, MapPlaceholder, reverseGeocode as universalReverseGeocode } from '../components/GoogleMapProvider.jsx';

// Format current clock time as HH:MM:SS
const clockTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

const containerStyle = { width: '100%', height: '100%' };

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'greedy',
  clickableIcons: false,
};

export default function TrackScreen({ user, updateProfile }) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [isTracking, setIsTracking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startLocation, setStartLocation] = useState('Home');
  const [destination, setDestination] = useState('Select on Map');
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [toast, setToast] = useState(null);

  // GPS State
  const [userLocation, setUserLocation] = useState(null);
  const [startCoords, setStartCoords] = useState({ lat: 19.076, lng: 72.877 });
  const [locationTrail, setLocationTrail] = useState([]);
  const [locationLog, setLocationLog] = useState([]);
  const [currentAddress, setCurrentAddress] = useState('Detecting...');
  const watchIdRef = useRef(null);
  const lastGeocodedRef = useRef(null);

  // Reverse geocode using Universal Geocoder
  const updateCurrentAddress = useCallback(async (lat, lng) => {
    // Throttle: only geocode if moved >50m from last geocoded point
    if (lastGeocodedRef.current) {
      const d = Math.sqrt(
        Math.pow((lat - lastGeocodedRef.current.lat) * 111000, 2) +
        Math.pow((lng - lastGeocodedRef.current.lng) * 111000 * Math.cos(lat * Math.PI / 180), 2)
      );
      if (d < 50) return; // skip if barely moved
    }

    try {
      const fullAddress = await universalReverseGeocode(lat, lng);
      const parts = fullAddress.split(',');
      const short = parts.slice(0, 2).join(',').trim();
      setCurrentAddress(short);
      lastGeocodedRef.current = { lat, lng };
    } catch (err) {
      console.warn('Geocoding error:', err);
    }
  }, []);

  // Shortcuts State
  const [shortcuts, setShortcuts] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [modalMode, setModalMode] = useState('selected');
  const [newShortcutName, setNewShortcutName] = useState('');
  const [newShortcutLocation, setNewShortcutLocation] = useState('');
  const [destAutocomplete, setDestAutocomplete] = useState(null);

  const mapRef = useRef(null);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // Real-time GPS tracking
  useEffect(() => {
    if (!user?.locationSharing || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setStartCoords(loc);
        updateCurrentAddress(loc.lat, loc.lng);
      },
      (err) => console.warn('Geolocation error:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setLocationTrail(prev => [...prev, loc]);
        updateCurrentAddress(loc.lat, loc.lng);
      },
      (err) => console.warn('Watch error:', err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [updateCurrentAddress, user?.locationSharing]);

  // Real-time synchronization for journey status
  useEffect(() => {
    if (!user) return;

    // Check for existing active session on mount
    const checkActiveSession = async () => {
      const { data } = await supabase
        .from('tracking_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data && !isTracking) {
        console.log('📡 Found active tracking session on another device');
        setIsTracking(true);
        setDestination(data.destination);
        setShareLink(data.share_link);
      }
    };

    checkActiveSession();

    let isMounted = true;
    const channelName = `tracking_sync_${user.id}_${Math.floor(Math.random() * 1000)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tracking_sessions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (!isMounted) return;
          console.log('🔔 Journey event received:', payload);
          if (payload.eventType === 'INSERT' && payload.new.is_active) {
            setIsTracking(true);
            setDestination(payload.new.destination);
            setShareLink(payload.new.share_link);
          } else if (payload.eventType === 'UPDATE' && !payload.new.is_active) {
            handleStop();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, isTracking]);

  // Record location log entries every 30s while tracking
  useEffect(() => {
    if (!isTracking || !userLocation) return;
    // Add initial entry
    if (locationLog.length === 0) {
      setLocationLog([{
        time: clockTime(),
        address: currentAddress,
        lat: userLocation.lat,
        lng: userLocation.lng,
        event: 'Journey started'
      }]);
    }
    const interval = setInterval(() => {
      setLocationLog(prev => [
        {
          time: clockTime(),
          address: currentAddress,
          lat: userLocation.lat,
          lng: userLocation.lng,
          event: 'Location update'
        },
        ...prev
      ].slice(0, 20)); // Keep max 20 entries
    }, 30000); // Log every 30 seconds
    return () => clearInterval(interval);
  }, [isTracking, userLocation, currentAddress]);

  // Load Shortcuts (Initialize from cloud or local)
  useEffect(() => {
    const local = localStorage.getItem('sahas_track_shortcuts');
    const cloud = user?.personalInfo?.shortcuts;

    if (cloud) {
      setShortcuts(cloud);
    } else if (local) {
      try {
        setShortcuts(JSON.parse(local));
      } catch (e) {
        console.error('Failed to parse local shortcuts', e);
      }
    }
  }, []);

  // Sync from cloud updates (Realtime)
  useEffect(() => {
    if (user?.personalInfo?.shortcuts) {
      setShortcuts(user.personalInfo.shortcuts);
      localStorage.setItem('sahas_track_shortcuts', JSON.stringify(user.personalInfo.shortcuts));
    }
  }, [user?.personalInfo?.shortcuts]);

  const saveToStorage = (newShortcuts) => {
    localStorage.setItem('sahas_track_shortcuts', JSON.stringify(newShortcuts));
    setShortcuts(newShortcuts);

    // Sync to cloud
    if (updateProfile && user) {
      updateProfile({
        personalInfo: {
          ...user.personalInfo,
          shortcuts: newShortcuts
        }
      });
    }
  };

  useEffect(() => {
    if (!isTracking) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [isTracking]);

  const handleMapClick = useCallback((e) => {
    if (isTracking) return;
    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setDestinationCoords(pos);
    
    // Reverse geocode the clicked spot to get a proper address
    const fetchAddress = async () => {
      try {
        const fullAddress = await universalReverseGeocode(pos.lat, pos.lng);
        const parts = fullAddress.split(',');
        const short = parts.slice(0, 2).join(',').trim();
        setDestination(short);
      } catch (err) {
        setDestination(`Custom: ${pos.lat.toFixed(3)}, ${pos.lng.toFixed(3)}`);
      }
    };
    fetchAddress();
  }, [isTracking, isLoaded]);

  const onAutocompleteLoad = (autocomplete) => {
    setDestAutocomplete(autocomplete);
  };

  const onPlaceChanged = () => {
    if (destAutocomplete !== null) {
      const place = destAutocomplete.getPlace();
      if (place.geometry) {
        const pos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setDestinationCoords(pos);
        setDestination(place.formatted_address || place.name);
        if (mapRef.current) {
          mapRef.current.panTo(pos);
          mapRef.current.setZoom(15);
        }
      } else {
        console.log("Autocomplete: Place has no geometry");
      }
    }
  };

  const handleStart = () => {
    if (!destinationCoords) {
      setToast({ msg: 'Please tap the map to select a destination first.', type: 'warning' });
      return;
    }
    setIsTracking(true);
    setLocationTrail(userLocation ? [userLocation] : [startCoords]);
    setLocationLog([]);
    setShareLink(`https://sahas.app/track/${Math.random().toString(36).slice(2, 10)}`);
  };

  const handleStop = () => {
    setIsTracking(false);
    setElapsed(0);
    setShareLink('');
    setLocationTrail([]);
    setLocationLog([]);
  };

  const handleAddShortcut = () => {
    if (!newShortcutName.trim()) return;
    const coordsToSave = modalMode === 'current' ? startCoords : destinationCoords;
    const addressToSave = modalMode === 'current' ? newShortcutLocation.trim() : destination;

    const newShortcut = {
      id: Date.now().toString(),
      name: newShortcutName.trim(),
      coords: coordsToSave,
      address: addressToSave
    };
    const updated = [...shortcuts, newShortcut];
    saveToStorage(updated);
    setNewShortcutName('');
    setNewShortcutLocation('');
    setShowSaveModal(false);
    setToast({ msg: 'Shortcut saved!', type: 'success' });
  };

  const handleDeleteShortcut = (id, e) => {
    e.stopPropagation();
    const updated = shortcuts.filter(s => s.id !== id);
    saveToStorage(updated);
    setToast({ msg: 'Shortcut removed', type: 'info' });
  };

  const useShortcut = (s) => {
    setDestination(s.name);
    setDestinationCoords(s.coords);
    setToast({ msg: `Destination set to ${s.name}`, type: 'success' });
  };

  const copyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareLink);
    }
    setToast({ msg: 'Live tracking link copied!', type: 'success' });
    setTimeout(() => setToast(null), 2500);
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const eta = Math.max(0, 30 - Math.floor(elapsed / 60));


  const handleCenterOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.panTo(userLocation);
      mapRef.current.setZoom(15);
    }
  };

  return (
    <div className="min-h-screen bg-sahas-dark noise screen-enter pb-28">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Save Shortcut Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className="w-full max-w-xs rounded-3xl p-6 shadow-2xl bg-sahas-card border border-sahas-border animate-scale-in">
            <h3 className="font-syne font-bold text-lg text-sahas-text mb-4 text-center">
              {modalMode === 'current' ? 'Add Location Shortcut' : 'Save Shortcut'}
            </h3>
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-[10px] font-dm font-bold text-sahas-muted mb-1 block uppercase tracking-wide ml-1">Shortcut Name</label>
                <input
                  type="text"
                  placeholder="E.g. Home, Office"
                  value={newShortcutName}
                  onChange={e => setNewShortcutName(e.target.value)}
                  className="w-full bg-sahas-dark border border-sahas-border rounded-xl px-4 py-3 text-sm font-dm text-sahas-text outline-none focus:border-sahas-teal"
                  autoFocus
                />
              </div>
              {modalMode === 'current' ? (
                <div>
                  <label className="text-[10px] font-dm font-bold text-sahas-muted mb-1 block uppercase tracking-wide ml-1">Location Address / Info</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="E.g. 123 Street Name"
                      value={newShortcutLocation}
                      onChange={e => setNewShortcutLocation(e.target.value)}
                      className="w-full bg-sahas-dark border border-sahas-border rounded-xl pl-4 pr-12 py-3 text-sm font-dm text-sahas-text outline-none focus:border-sahas-teal"
                    />
                    <button
                      onClick={() => {
                        if (userLocation) {
                          setNewShortcutLocation(`${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)} – Detected`);
                        } else {
                          setNewShortcutLocation('Andheri West, Mumbai – Detected');
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sahas-teal text-lg"
                    >
                      📍
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-sahas-dark/50 border border-sahas-border rounded-xl">
                  <p className="text-[10px] font-dm text-sahas-muted uppercase tracking-wide mb-0.5">Selected Location</p>
                  <p className="text-xs font-dm text-sahas-text">{destination}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowSaveModal(false); setNewShortcutName(''); setNewShortcutLocation(''); }}
                className="flex-1 py-3 rounded-xl font-dm text-sm text-sahas-soft border border-sahas-border"
              >
                Cancel
              </button>
              <button
                onClick={handleAddShortcut}
                className="flex-1 py-3 rounded-xl font-dm font-bold text-sm text-sahas-dark bg-sahas-teal"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sahas-soft text-xs font-dm tracking-widest uppercase">Journey</p>
            <h1 className="font-syne font-800 text-2xl text-sahas-text mt-0.5">
              Live Tracker <span className="text-sahas-red">.</span>
            </h1>
          </div>
          {isTracking && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sahas-red/10 border border-sahas-red/30">
              <span className="w-2 h-2 rounded-full bg-sahas-red rec-dot" />
              <span className="text-xs font-dm text-sahas-red">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Live Location Status */}
      <div className="px-5 mb-3">
        <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-dm ${
          userLocation
            ? 'bg-sahas-teal/5 border-sahas-teal/20 text-sahas-teal'
            : 'bg-sahas-amber/5 border-sahas-amber/20 text-sahas-amber'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${userLocation ? 'bg-sahas-teal animate-pulse' : 'bg-sahas-amber'}`} />
            {userLocation
              ? `GPS Active: ${userLocation.lat.toFixed(4)}°N, ${userLocation.lng.toFixed(4)}°E`
              : 'Getting GPS location...'
            }
          </div>
          {userLocation && (
            <button
              onClick={handleCenterOnUser}
              className="text-[10px] font-dm font-bold text-sahas-teal uppercase tracking-wider"
            >
              Center
            </button>
          )}
        </div>
      </div>

      {/* Google Map */}
      <div className="mx-5 mb-4 rounded-3xl overflow-hidden border border-sahas-border relative bg-sahas-card h-72">
        {!isLoaded ? (
          <MapPlaceholder loadError={loadError} />
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={userLocation || startCoords}
            zoom={13}
            options={{
              ...mapOptions,
              draggableCursor: !isTracking ? 'crosshair' : undefined,
            }}
            onClick={handleMapClick}
            onLoad={onMapLoad}
          >
            {/* User Live Location */}
            {userLocation && (
              <Marker
                position={userLocation}
                type="user"
                zIndex={1000}
              />
            )}

            {/* Destination Marker */}
            {destinationCoords && (
              <Marker
                position={destinationCoords}
                title={destination || 'Destination'}
                type="danger"
              />
            )}

            {/* Route Line (straight line to destination) */}
            {isTracking && destinationCoords && (
              <Polyline
                path={[userLocation || startCoords, destinationCoords]}
                options={{
                  strokeColor: '#FF2D55',
                  strokeOpacity: 0.8,
                  strokeWeight: 4,
                  geodesic: true,
                  icons: [{
                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                    offset: '0',
                    repeat: '16px'
                  }],
                }}
              />
            )}

            {/* Location Trail (breadcrumb path while tracking) */}
            {isTracking && locationTrail.length > 1 && (
              <Polyline
                path={locationTrail}
                options={{
                  strokeColor: '#00C4CC',
                  strokeOpacity: 0.6,
                  strokeWeight: 3,
                  geodesic: true,
                }}
              />
            )}
          </GoogleMap>
        )}

        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end z-[400] pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sahas-dark/90 backdrop-blur-md shadow-lg border border-sahas-border/50">
            <span className={`w-2 h-2 rounded-full ${isTracking ? 'bg-sahas-red rec-dot' : 'bg-blue-500 animate-pulse'}`} />
            <span className="text-[10px] font-dm text-sahas-text font-medium uppercase tracking-tight">
              {isTracking ? 'Tracking live...' : 'Tap map to set goal'}
            </span>
          </div>
        </div>
      </div>

      {/* Shortcuts Area */}
      <div className="px-5 mb-6">
        <p className="text-[10px] font-syne font-bold text-sahas-teal uppercase tracking-widest mb-3 ml-1">Quick Destinations</p>
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => { setModalMode('current'); setShowSaveModal(true); }}
            className="flex-shrink-0 flex items-center justify-center w-12 h-[42px] bg-sahas-card border border-dashed border-sahas-border rounded-xl hover:border-sahas-teal/50 transition-all"
          >
            <span className="text-xl text-sahas-teal font-light">+</span>
          </button>
          {shortcuts.length === 0 ? (
            <div className="flex-1 py-2.5 flex items-center px-4 bg-sahas-card/30 border border-dashed border-sahas-border/50 rounded-xl">
              <p className="text-[9px] font-dm text-sahas-muted uppercase tracking-tight">No saved spots yet</p>
            </div>
          ) : (
            shortcuts.map(s => (
              <div
                key={s.id}
                onClick={() => useShortcut(s)}
                className="flex-shrink-0 group relative flex items-center justify-center px-4 py-2 min-w-[80px] bg-sahas-card border border-sahas-border rounded-xl hover:border-sahas-teal/50 transition-all cursor-pointer"
                role="button"
                tabIndex={0}
              >
                <p className="text-[11px] font-syne font-700 text-sahas-text uppercase tracking-wider">{s.name}</p>
                <button
                  onClick={(e) => handleDeleteShortcut(s.id, e)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-sahas-dark border border-sahas-red/30 text-sahas-red text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Journey Details */}
      {isTracking ? (
        <div className="px-5 mb-4 animate-slide-up">
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[
                { label: 'Origin', value: startLocation || 'Current Location' },
                { label: 'Destination', value: destination },
                { label: 'Elapsed', value: formatTime(elapsed) },
                { label: 'ETA', value: `${eta} min` },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-[10px] font-dm text-sahas-soft mb-1 uppercase tracking-wider">{item.label}</p>
                  <p className="font-syne font-700 text-sahas-text text-sm truncate">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-sahas-border pt-4">
              <p className="text-[10px] font-dm text-sahas-soft mb-3 uppercase tracking-wider">Live Updates</p>
              <div className="space-y-2">
                {/* Current live position */}
                {userLocation && (
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-sahas-teal rec-dot flex-shrink-0" />
                    <span className="text-[10px] font-dm text-sahas-soft tabular-nums">{clockTime()}</span>
                    <span className="text-[10px] font-dm text-sahas-text font-medium flex-1 truncate">
                      {currentAddress}
                    </span>
                    <span className="text-[9px] font-dm text-sahas-teal">Live</span>
                  </div>
                )}
                {/* Recorded location log (real GPS entries) */}
                {locationLog.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? 'bg-sahas-green' : 'bg-sahas-muted'}`} />
                    <span className="text-[10px] font-dm text-sahas-soft tabular-nums">{entry.time}</span>
                    <span className="text-[10px] font-dm text-sahas-text font-medium flex-1 truncate">{entry.address}</span>
                    <span className="text-[9px] font-dm text-sahas-green">GPS ✓</span>
                  </div>
                ))}
                {locationLog.length === 0 && !userLocation && (
                  <p className="text-[10px] font-dm text-sahas-muted">Waiting for GPS signal...</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="px-5 mb-4">
          <Card className="p-5">
            <p className="text-[10px] font-syne font-bold text-sahas-soft mb-4 uppercase tracking-widest">Journey Setup</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-dm font-bold text-sahas-muted mb-1.5 block uppercase tracking-wide">Starting From</label>
                <div className="relative">
                  <input
                    value={startLocation}
                    onChange={e => setStartLocation(e.target.value)}
                    className="w-full bg-sahas-dark border border-sahas-border rounded-xl pl-4 pr-12 py-3 text-sm font-dm text-sahas-text outline-none focus:border-sahas-teal/40 transition-colors"
                  />
                  <button
                    onClick={() => {
                      if (userLocation) {
                        setStartLocation(`GPS: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`);
                        setStartCoords(userLocation);
                      } else {
                        setStartLocation('Current Location (Detecting...)');
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sahas-teal"
                  >📍</button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-dm font-bold text-sahas-muted mb-1.5 block uppercase tracking-wide">Final Destination</label>
                <div className="relative">
                  {isLoaded ? (
                    <Autocomplete
                      onLoad={onAutocompleteLoad}
                      onPlaceChanged={onPlaceChanged}
                      options={{ fields: ['geometry', 'formatted_address', 'name'] }}
                    >
                      <input
                        value={destination}
                        onChange={e => setDestination(e.target.value)}
                        className="w-full bg-sahas-dark border border-sahas-border rounded-xl pl-4 pr-12 py-3 text-sm font-dm text-sahas-text outline-none focus:border-sahas-teal/40 transition-colors"
                        placeholder="Search for a destination..."
                      />
                    </Autocomplete>
                  ) : (
                    <input
                      value={destination}
                      onChange={e => setDestination(e.target.value)}
                      className="w-full bg-sahas-dark border border-sahas-border rounded-xl pl-4 pr-12 py-3 text-sm font-dm text-sahas-text outline-none focus:border-sahas-teal/40 transition-colors"
                      placeholder="Loading search..."
                    />
                  )}
                  <button
                    onClick={() => setDestination('Current Location (Detected)')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sahas-teal z-10"
                  >📍</button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Action Button */}
      <div className="px-5">
        {isTracking ? (
          <button
            onClick={handleStop}
            className="w-full py-4 rounded-2xl border border-sahas-red/40 bg-sahas-red/10 text-sahas-red font-syne font-700 text-sm active:scale-95 transition-all shadow-xl shadow-sahas-red/5"
          >
            ■ End Live Journey
          </button>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handleStart}
              className={`w-full py-4 rounded-2xl font-syne font-800 text-sm active:scale-95 transition-all ${
                destinationCoords
                  ? 'bg-gradient-to-r from-sahas-teal to-sahas-green text-sahas-dark shadow-xl shadow-sahas-teal/20'
                  : 'bg-sahas-card border border-sahas-border text-sahas-soft'
              }`}
            >
              {destinationCoords ? '▶ Start Tracking & Share' : 'Choose Goal on Map'}
            </button>

            {shareLink && (
              <div className="p-4 rounded-2xl bg-sahas-teal/5 border border-sahas-teal/20 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-syne font-bold text-sahas-teal uppercase tracking-widest">Shareable Link Active</p>
                  <p className="text-[10px] font-dm text-sahas-soft mt-0.5 truncate max-w-[180px]">{shareLink}</p>
                </div>
                <button onClick={copyLink} className="px-4 py-2 rounded-lg bg-sahas-teal text-sahas-dark font-syne font-bold text-[10px]">COPY</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
