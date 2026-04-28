import React, { useState, useCallback, useMemo } from 'react';
import { GoogleMap as GoogleMapBase, useJsApiLoader, Marker as GoogleMarker, Circle as GoogleCircle, InfoWindow as GoogleInfoWindow, Polyline as GooglePolyline, Autocomplete as GoogleAutocomplete } from '@react-google-maps/api';

const libraries = ['places'];

/** Premium Dark style for Google Maps */
export const DARK_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "administrative.country", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "administrative.land_parcel", "stylers": [{ "visibility": "off" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "poi.park", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1b1b1b" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#373737" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3c3c3c" }] },
  { "featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{ "color": "#4e4e4e" }] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#3d3d3d" }] }
];

export function useGoogleMaps() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries
  });
  return { isLoaded, loadError };
}

/** 
 * High-Accuracy Location Hook 
 */
export const fetchAccurateLocation = async (requireGPS = false) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      if (requireGPS) reject(new Error('Geolocation not supported'));
      else resolve(fetchIPFallback());
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: 'gps'
        });
      },
      async (err) => {
        if (err.code === 1) { // PERMISSION_DENIED
          console.warn('GPS access denied by user.');
          reject(err);
          return;
        }
        if (requireGPS) {
          reject(err);
        } else {
          console.warn('GPS failed, using IP fallback:', err.message);
          resolve(await fetchIPFallback());
        }
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 
      }
    );
  });
};

const fetchIPFallback = async () => {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    return {
      lat: data.latitude,
      lng: data.longitude,
      accuracy: 5000,
      source: 'ip'
    };
  } catch (e) {
    return { lat: 19.076, lng: 72.877, accuracy: 10000, source: 'fallback' };
  }
};


/**
 * Clean & Safe Geocoding Utility
 * Always tries Google first, then falls back to Nominatim.
 * Avoids global overrides to prevent recursion issues.
 */
export const reverseGeocode = async (lat, lng) => {
  return new Promise((resolve) => {
    const fallback = () => {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
        .then(res => res.json())
        .then(data => resolve(data?.display_name || `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`))
        .catch(() => resolve(`Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`));
    };

    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          resolve(results[0].formatted_address);
        } else {
          fallback();
        }
      });
    } else {
      fallback();
    }
  });
};

/**
 * Searches for the nearest emergency point (Police or Hospital)
 */
export const findNearestEmergencyPoint = async (lat, lng) => {
  return new Promise((resolve) => {
    console.log(`🔍 [SafePoint] Searching for nearest emergency help...`);
    const startTime = Date.now();

    const trySearch = () => {
      if (Date.now() - startTime > 8000) {
        resolve({ name: 'Safe Point', address: 'Nearby emergency help' });
        return;
      }

      if (!window.google?.maps?.places) {
        setTimeout(trySearch, 500);
        return;
      }

      try {
        const service = new window.google.maps.places.PlacesService(document.createElement('div'));
        service.nearbySearch(
          {
            location: { lat, lng },
            radius: 15000,
            // Search for BOTH police and hospitals
            type: ['police', 'hospital']
          },
          (results, status) => {
            if (status === 'OK' && results?.[0]) {
              // Priority: Find the closest one
              const best = results[0];
              resolve({
                name: best.name,
                address: best.vicinity || best.formatted_address,
                type: (best.types.includes('police')) ? 'Police' : 'Hospital',
                location: {
                  lat: best.geometry.location.lat(),
                  lng: best.geometry.location.lng()
                }
              });
            } else {
              // Broad fallback keyword
              service.nearbySearch({
                location: { lat, lng },
                radius: 20000,
                keyword: 'emergency'
              }, (results2, status2) => {
                if (status2 === 'OK' && results2?.[0]) {
                  resolve({
                    name: results2[0].name,
                    address: results2[0].vicinity || results2[0].formatted_address,
                    type: 'Emergency',
                    location: {
                      lat: results2[0].geometry.location.lat(),
                      lng: results2[0].geometry.location.lng()
                    }
                  });
                } else {
                  resolve({ name: 'Emergency Help', address: 'Nearby safe haven' });
                }
              });
            }
          }
        );
      } catch (e) {
        resolve({ name: 'Safe Point', address: 'Nearby emergency help' });
      }
    };

    trySearch();
  });
};

export const forwardGeocode = async (address) => {
  return new Promise((resolve, reject) => {
    const fallback = () => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
        .then(res => res.json())
        .then(data => {
          if (data && data[0]) {
            resolve({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
          } else {
            reject(new Error('Address not found'));
          }
        })
        .catch(err => reject(err));
    };

    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else {
          fallback();
        }
      });
    } else {
      fallback();
    }
  });
};

/** GoogleMap Wrapper */
export function GoogleMap({ children, center, zoom, mapContainerStyle, options, onClick, onLoad }) {
  const mapOptions = useMemo(() => ({
    styles: DARK_MAP_STYLE,
    disableDefaultUI: true,
    zoomControl: true,
    clickableIcons: false,
    ...options
  }), [options]);

  const handleMapClick = useCallback((e) => {
    if (onClick) {
      onClick({
        latLng: {
          lat: () => e.latLng.lat(),
          lng: () => e.latLng.lng()
        }
      });
    }
  }, [onClick]);

  return (
    <GoogleMapBase
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={zoom || 14}
      options={mapOptions}
      onClick={handleMapClick}
      onLoad={onLoad}
    >
      {children}
    </GoogleMapBase>
  );
}

/** Marker Wrapper */
export function Marker({ position, title, type, description, onClick, zIndex }) {
  const getIcon = () => {
    const t = (type || '').toLowerCase();
    let color = '#3B82F6';
    if (t === 'hospital') color = '#EF4444';
    if (t === 'police') color = '#1E40AF';
    if (t.includes('danger') || t.includes('sos')) color = '#FF2D55';

    return {
      path: 'M-20,0a20,20 0 1,0 40,0a20,20 0 1,0 -40,0',
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: 0.5,
    };
  };

  return (
    <GoogleMarker
      position={position}
      title={title}
      icon={getIcon()}
      onClick={onClick}
      zIndex={zIndex}
    />
  );
}

/** Circle Wrapper */
export function Circle({ center, radius, options, onClick }) {
  return (
    <GoogleCircle
      center={center}
      radius={radius}
      options={{
        clickable: true,
        ...options
      }}
      onClick={onClick}
    />
  );
}

/** InfoWindow Wrapper */
export function InfoWindow({ position, children, onCloseClick }) {
  return (
    <GoogleInfoWindow position={position} onCloseClick={onCloseClick}>
      {children}
    </GoogleInfoWindow>
  );
}

/** Polyline Wrapper */
export function Polyline({ path, options }) {
  return (
    <GooglePolyline
      path={path}
      options={{
        strokeColor: options?.strokeColor || '#00C4CC',
        strokeOpacity: options?.strokeOpacity || 0.8,
        strokeWeight: options?.strokeWeight || 4,
      }}
    />
  );
}

/** Autocomplete Wrapper */
export function Autocomplete({ children, onLoad, onPlaceChanged }) {
  return (
    <GoogleAutocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
      {children}
    </GoogleAutocomplete>
  );
}

export function MapPlaceholder({ message = "Initializing Map..." }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-sahas-card rounded-2xl border border-dashed border-sahas-border/50 animate-pulse min-h-[200px]">
      <div className="text-center">
        <span className="text-3xl mb-3 block">📍</span>
        <p className="text-xs font-dm text-sahas-soft tracking-widest uppercase">{message}</p>
      </div>
    </div>
  );
}

export function LocateMeButton({ onLocationFound, onError }) {
  const handleLocate = async () => {
    try {
      // Use requireGPS=true so we don't accidentally show a random IP pin on maps
      const loc = await fetchAccurateLocation(true);
      if (onLocationFound) onLocationFound(loc);
    } catch (err) {
      console.warn('Map location capture failed:', err);
      if (onError) onError(err);
    }
  };

  return (
    <button
      onClick={handleLocate}
      className="absolute bottom-10 right-6 z-10 w-12 h-12 bg-sahas-card border border-sahas-border rounded-full shadow-2xl flex items-center justify-center text-xl hover:bg-sahas-dark transition-all active:scale-90"
      title="Center on my location"
    >
      🎯
    </button>
  );
}
