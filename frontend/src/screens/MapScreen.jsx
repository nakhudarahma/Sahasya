import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Toast } from '../components/UI.jsx';
import { GoogleMap, Circle, Marker, InfoWindow, useGoogleMaps, MapPlaceholder, LocateMeButton, fetchAccurateLocation } from '../components/GoogleMapProvider.jsx';
import { api } from '../api.js';

const ZONE_COLORS = {
  danger: { fill: 'rgba(255,45,85,0.25)', stroke: '#FF2D55', label: 'text-sahas-red', badge: 'bg-sahas-red/20 border-sahas-red/30 text-sahas-red' },
  caution: { fill: 'rgba(255,184,0,0.20)', stroke: '#FFB800', label: 'text-sahas-amber', badge: 'bg-sahas-amber/20 border-sahas-amber/30 text-sahas-amber' },
  safe: { fill: 'rgba(0,214,143,0.18)', stroke: '#00D68F', label: 'text-sahas-green', badge: 'bg-sahas-green/20 border-sahas-green/30 text-sahas-green' },
};

const FILTERS = ['All', 'Danger', 'Caution', 'Safe'];

// Hardcoded fallback zones
const FALLBACK_ZONES = [
  { id: 'f1', label: 'Dharavi', type: 'danger', lat: 19.0437, lng: 72.8527, radius: 600, description: 'Multiple incidents reported. Avoid after dark.' },
  { id: 'bh1', label: 'Bhiwandi Market St.', type: 'caution', lat: 19.3018, lng: 73.0535, radius: 400, description: 'High congestion area, stay alert.' },
  { id: 'bh2', label: 'Samad Nagar Area', type: 'safe', lat: 19.2980, lng: 73.0500, radius: 500, description: 'Active residential community, well patrolled.' },
  { id: 'th1', label: 'Thane Station East', type: 'danger', lat: 19.1860, lng: 72.9750, radius: 500, description: 'Poorly lit exits, avoid at night.' },
  { id: 'f7', label: 'Marine Drive', type: 'safe', lat: 18.9436, lng: 72.8234, radius: 500, description: 'Major landmark, police patrolled 24/7.' },
];

const containerStyle = { width: '100%', height: '22rem' };

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'greedy',
  clickableIcons: true, // Re-enabled so Google shows its own hospitals/police
};

export default function MapScreen({ user, initialFocus }) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [infoZone, setInfoZone] = useState(null);
  const [toast, setToast] = useState(null);
  const [reportMode, setReportMode] = useState(false);
  const [reportPos, setReportPos] = useState(null);
  const [zones, setZones] = useState(FALLBACK_ZONES);
  const [loading, setLoading] = useState(true);
  const [reportDescription, setReportDescription] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(initialFocus || { lat: 19.076, lng: 72.877 });
  const [locationPermission, setLocationPermission] = useState('prompt');
  const mapRef = useRef(null);

  // Monitor real browser permission in real-time
  useEffect(() => {
    if (!navigator.permissions) return;
    let permStatus = null;
    navigator.permissions.query({ name: 'geolocation' }).then(status => {
      permStatus = status;
      setLocationPermission(status.state);
      status.onchange = () => {
        setLocationPermission(status.state);
        if (status.state !== 'granted') {
          setUserLocation(null); // Clear the pin immediately
        }
      };
    }).catch(() => {});
    return () => { if (permStatus) permStatus.onchange = null; };
  }, []);

  // Handle focus changes from props
  useEffect(() => {
    if (initialFocus && mapRef.current) {
      mapRef.current.panTo(initialFocus);
      mapRef.current.setZoom(17);
    }
  }, [initialFocus]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    if (initialFocus) {
      map.panTo(initialFocus);
      map.setZoom(17);
    }
  }, [initialFocus]);

  const handleLocationFound = (loc) => {
    setUserLocation(loc);
    setMapCenter(loc);
    fetchMapData();
  };

  const handleCenterOnUser = () => {
    if (locationPermission === 'denied') {
      setToast({ msg: '📍 Location access denied. Enable it in your browser settings.', type: 'error' });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    if (userLocation && mapRef.current) {
      mapRef.current.panTo(userLocation);
      mapRef.current.setZoom(15);
      return;
    }
    // Try to get location — this will trigger browser's permission prompt if needed
    setToast({ msg: 'Locating you...', type: 'info' });
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocationPermission('granted');
        handleLocationFound(loc);
        setToast(null);
      },
      (err) => {
        if (err.code === 1) {
          setLocationPermission('denied');
          setToast({ msg: '📍 Location access denied. Enable it in your browser settings.', type: 'error' });
        } else {
          setToast({ msg: 'Could not detect location. Try again.', type: 'error' });
        }
        setTimeout(() => setToast(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };


  // Initial location fetch — only if browser actually grants permission
  useEffect(() => {
    if (user?.locationSharing === false) {
      setLoading(false);
      fetchMapData();
      return;
    }
    const init = async () => {
      try {
        // Check real permission first
        if (navigator.permissions) {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          setLocationPermission(status.state);
          if (status.state === 'denied') {
            setUserLocation(null);
            setLoading(false);
            fetchMapData();
            return;
          }
        }
        const loc = await fetchAccurateLocation(true).catch(() => null);
        if (loc?.lat && loc?.lng) {
          setUserLocation(loc);
          setMapCenter(loc);
          setLocationPermission('granted');
        } else {
          // If strictly denied or failed, don't show a user pin
          setUserLocation(null);
        }
      } catch (err) {
        console.warn('Initial location fetch failed:', err);
        setUserLocation(null);
      }
      fetchMapData();
    };
    init();
  }, [user?.locationSharing]);

  const fetchMapData = async () => {
    try {
      const params = userLocation ? `?lat=${userLocation.lat}&lng=${userLocation.lng}` : '';
      const hotspots = await api.get(`/safety/hotspots${params}`).catch(() => []);
      if (hotspots && hotspots.length > 0) setZones(hotspots);
    } catch (err) {
      console.warn('Map data fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, []);

  const handleMapClick = useCallback((e) => {
    if (!reportMode) return;
    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setReportPos(pos);
    setToast({ msg: 'Area marked. Fill in report details below.', type: 'warning' });
    setTimeout(() => setToast(null), 3000);
    setReportMode(false);
  }, [reportMode]);

  const filteredZones = zones.filter(z =>
    filter === 'All' || z.type === filter.toLowerCase()
  );

  const stats = {
    total: zones.length,
    danger: zones.filter(z => z.type === 'danger').length,
    caution: zones.filter(z => z.type === 'caution').length,
    safe: zones.filter(z => z.type === 'safe').length,
  };

  const handleReport = async () => {
    if (!reportPos) return;
    try {
      await api.post('/safety/hotspots', {
        label: 'Community Report',
        type: 'caution',
        lat: reportPos.lat,
        lng: reportPos.lng,
        radius: 100,
        description: reportDescription
      });
      setToast({ msg: 'Report submitted! Thank you.', type: 'success' });
      setReportPos(null);
      setReportDescription('');
      fetchMapData();
    } catch (err) {
      setToast({ msg: 'Failed to submit report.', type: 'error' });
    }
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="min-h-screen bg-sahas-dark noise screen-enter pb-28">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="px-5 pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sahas-soft text-xs font-dm tracking-widest uppercase">Community</p>
            <h1 className="font-syne font-800 text-2xl text-sahas-text mt-0.5">
              Safety Map <span className="text-sahas-red">.</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCenterOnUser}
              className="px-3 py-2 rounded-xl text-xs font-dm font-medium bg-sahas-card border border-sahas-border text-sahas-teal hover:border-sahas-teal/40 transition-all"
              title="Center on my location"
            >
              📍 My Location
            </button>
            <button
              onClick={() => setReportMode(!reportMode)}
              className={`px-3 py-2 rounded-xl text-xs font-dm font-medium transition-all ${
                reportMode
                  ? 'bg-sahas-red text-white'
                  : 'bg-sahas-card border border-sahas-border text-sahas-soft hover:border-sahas-muted'
              }`}
            >
              {reportMode ? '✕ Cancel' : '⚑ Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Live Location Status */}
      <div className="px-5 mb-3">
        <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-[10px] font-dm ${
          userLocation 
            ? 'bg-sahas-green/5 border-sahas-green/20 text-sahas-green' 
            : locationPermission === 'denied'
              ? 'bg-sahas-red/5 border-sahas-red/20 text-sahas-red'
              : (user?.locationSharing === false ? 'bg-sahas-soft/5 border-sahas-border text-sahas-soft' : 'bg-sahas-amber/5 border-sahas-amber/20 text-sahas-amber')
        }`}>
          <div className="flex items-center gap-2 truncate">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              userLocation ? 'bg-sahas-green animate-pulse' 
              : locationPermission === 'denied' ? 'bg-sahas-red'
              : (user?.locationSharing === false ? 'bg-sahas-soft' : 'bg-sahas-amber')
            }`} />
            {userLocation 
              ? `Position: ${userLocation.lat.toFixed(4)}°N, ${userLocation.lng.toFixed(4)}°E`
              : locationPermission === 'denied'
                ? 'Location access denied — enable in browser settings'
                : (user?.locationSharing === false ? 'Location sharing is disabled' : 'Pinpointing location...')
            }
          </div>
          {user?.locationSharing === false && locationPermission !== 'denied' && (
            <span className="text-[9px] font-bold text-sahas-teal uppercase tracking-tight">Enable in App Settings</span>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-5 mb-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'High Risk', count: stats.danger, color: 'sahas-red' },
            { label: 'Caution', count: stats.caution, color: 'sahas-amber' },
            { label: 'Safe Zones', count: stats.safe, color: 'sahas-green' },
          ].map((s) => (
            <div key={s.label} className="bg-sahas-card border border-sahas-border rounded-2xl p-3 text-center">
              <p className={`font-syne font-800 text-xl text-${s.color}`}>{s.count}</p>
              <p className="text-[10px] font-dm text-sahas-soft mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-dm font-medium transition-all ${
                filter === f
                  ? 'bg-sahas-red text-white'
                  : 'bg-sahas-card border border-sahas-border text-sahas-soft hover:border-sahas-muted'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Google Map */}
      <div className="mx-5 mb-4 rounded-2xl overflow-hidden border border-sahas-border relative bg-sahas-card shadow-2xl">
        {!isLoaded ? (
          <div style={{ height: '22rem' }}>
            <MapPlaceholder loadError={loadError} />
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapCenter}
            zoom={13}
            options={{
              ...mapOptions,
              draggableCursor: reportMode ? 'crosshair' : undefined,
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
            
            <LocateMeButton 
              onLocationFound={handleLocationFound} 
              onError={(err) => {
                if (err.code === 1) {
                  setLocationPermission('denied');
                  setToast({ msg: '📍 Location access denied. Enable it in your browser settings.', type: 'error' });
                } else {
                  setToast({ msg: 'Could not detect location. Try again.', type: 'error' });
                }
                setTimeout(() => setToast(null), 4000);
              }}
            />

            {/* Safety Zone Circles and Markers */}
            {filteredZones.map((zone) => {
              const c = ZONE_COLORS[zone.type] || ZONE_COLORS.caution;
              return (
                <React.Fragment key={zone.id}>
                  <Marker
                    position={{ lat: zone.lat, lng: zone.lng }}
                    type={zone.type}
                    title={zone.label}
                    onClick={() => {
                      setSelected(zone.id === selected ? null : zone.id);
                      setInfoZone(zone.id === infoZone ? null : zone.id);
                    }}
                  />
                  <Circle
                    center={{ lat: zone.lat, lng: zone.lng }}
                    radius={Math.max(zone.radius || 0, 500)} // Minimum visible radius
                    options={{
                      strokeColor: c.stroke,
                      strokeOpacity: 0.8,
                      strokeWeight: 2,
                      fillColor: c.stroke,
                      fillOpacity: 0.25,
                      clickable: true,
                      zIndex: zone.type === 'danger' ? 2 : 1
                    }}
                    onClick={() => {
                      setSelected(zone.id === selected ? null : zone.id);
                      setInfoZone(zone.id === infoZone ? null : zone.id);
                    }}
                  />
                </React.Fragment>
              );
            })}

            {/* Info Windows for zones */}
            {infoZone && (() => {
              const zone = zones.find(z => z.id === infoZone);
              if (!zone) return null;
              const c = ZONE_COLORS[zone.type] || ZONE_COLORS.caution;
              return (
                <InfoWindow
                  position={{ lat: zone.lat, lng: zone.lng }}
                  onCloseClick={() => setInfoZone(null)}
                >
                  <div className="p-1 min-w-[150px]">
                    <p className="font-syne font-700 text-sm mb-1">{zone.label}</p>
                    <p className={`text-[10px] font-dm uppercase tracking-wider mb-2 ${c.label}`}>
                      ● {zone.type} zone
                    </p>
                    <p className="text-[10px] font-dm text-sahas-soft leading-relaxed">{zone.description}</p>
                  </div>
                </InfoWindow>
              );
            })()}

            {/* Report Pin */}
            {reportPos && (
              <Marker
                position={reportPos}
                title="Reporting Area"
                type="caution"
              />
            )}
          </GoogleMap>
        )}

        {/* Report mode indicator */}
        {reportMode && (
          <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sahas-red/90 backdrop-blur-md shadow-lg">
              <span className="w-2 h-2 rounded-full bg-white rec-dot" />
              <span className="text-[10px] font-dm text-white font-medium uppercase tracking-tight">Tap map to report area</span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Zone Info */}
      {selected && (() => {
        const zone = zones.find(z => z.id === selected);
        if (!zone) return null;
        const colors = ZONE_COLORS[zone.type] || ZONE_COLORS.caution;
        return (
          <div className="px-5 mb-4 animate-scale-in">
            <div className={`p-4 rounded-2xl border ${colors.badge}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-syne font-700 text-sm">{zone.label}</p>
                <span className={`text-xs font-dm px-2 py-0.5 rounded-full border ${colors.badge} capitalize`}>
                  {zone.type}
                </span>
              </div>
              <p className="text-xs font-dm opacity-80">{zone.description || 'Verified safety zone data.'}</p>
            </div>
          </div>
        );
      })()}

      {/* Reporting UI */}
      {reportPos && !reportMode && (
        <div className="px-5 mb-4 animate-scale-in">
          <Card className="p-4">
            <p className="text-xs font-dm text-sahas-soft mb-3 uppercase tracking-wider">Report This Area</p>
            <textarea
              className="w-full bg-sahas-dark border border-sahas-border rounded-xl p-3 text-sm font-dm text-sahas-text outline-none focus:border-sahas-amber/50 resize-none h-20"
              placeholder="Describe what you observed..."
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
            />
            <button
              onClick={handleReport}
              className="w-full mt-3 py-3 rounded-xl bg-sahas-amber/20 border border-sahas-amber/30 text-sahas-amber text-sm font-dm font-medium hover:bg-sahas-amber/30 transition-colors"
            >
              Submit Community Report
            </button>
          </Card>
        </div>
      )}

      {/* Extra space */}
      <div className="h-4" />
    </div>
  );
}
