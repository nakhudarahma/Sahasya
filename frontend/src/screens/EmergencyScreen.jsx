import React, { useState, useEffect, useRef } from 'react';
import { reverseGeocode as universalReverseGeocode, fetchAccurateLocation } from '../components/GoogleMapProvider.jsx';
import { useIncidents } from '../hooks/useIncidents.js';
import { api } from '../api.js';

const COLORS = ['#FF6B35', '#00D68F', '#00C4CC', '#9B59B6', '#FFB800', '#7C3AED'];
const colorFromName = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
};
const getInitials = (name = '') =>
  name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

export default function EmergencyScreen({ onCancel, user }) {
  const [phase, setPhase] = useState('countdown'); // countdown | active | sent
  const [countdown, setCountdown] = useState(5);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('Detecting...');
  const [locationCoords, setLocationCoords] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [alertsSent, setAlertsSent] = useState([]);
  const [activeIncidentId, setActiveIncidentId] = useState(() => localStorage.getItem('sahasya_active_incident_id'));
  const [activeTrackId, setActiveTrackId] = useState(() => localStorage.getItem('sahasya_active_track_id'));
  const [activationDate, setActivationDate] = useState(() => {
    const saved = localStorage.getItem('sahasya_sos_start_time');
    return saved ? new Date(saved) : null;
  });

  // Sync state to storage to prevent "auto-cancel" on refresh/crash
  useEffect(() => {
    if (activeIncidentId) localStorage.setItem('sahasya_active_incident_id', activeIncidentId);
    else localStorage.removeItem('sahasya_active_incident_id');
  }, [activeIncidentId]);

  useEffect(() => {
    if (activeTrackId) localStorage.setItem('sahasya_active_track_id', activeTrackId);
    else localStorage.removeItem('sahasya_active_track_id');
  }, [activeTrackId]);

  useEffect(() => {
    if (activationDate) localStorage.setItem('sahasya_sos_start_time', activationDate.toISOString());
    else localStorage.removeItem('sahasya_sos_start_time');
  }, [activationDate]);

  // Handle recovery only if the session is recent (e.g., < 30 mins old)
  useEffect(() => {
    if (activeIncidentId && phase === 'countdown') {
      const startTime = localStorage.getItem('sahasya_sos_start_time');
      const isRecent = startTime && (Date.now() - new Date(startTime).getTime()) < 30 * 60 * 1000;
      
      if (isRecent) {
        setPhase('active');
        setRecording(true);
        if (!activationDate) setActivationDate(new Date(startTime));
      } else {
        // Purge stale session
        localStorage.removeItem('sahasya_active_incident_id');
        localStorage.removeItem('sahasya_active_track_id');
        localStorage.removeItem('sahasya_sos_start_time');
        setActiveIncidentId(null);
        setActiveTrackId(null);
      }
    }
  }, []);
  const intervalRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const phaseRef = useRef(phase); // Track phase without causing GPS re-runs
  const locationRef = useRef(null);  // Always has latest GPS coords
  const addressRef = useRef('Detecting...');  // Always has latest address
  const hasSentPinpointRef = useRef(false); // Track if follow-up precision alert was sent
  
  // Keep phaseRef in sync with phase state
  useEffect(() => { 
    phaseRef.current = phase; 
    if (phase !== 'active') hasSentPinpointRef.current = false; // Reset on cancel
  }, [phase]);
  const { saveIncident } = useIncidents(user);

  // Reverse geocode current position
  const fetchCurrentAddress = async (lat, lng) => {
    try {
      const address = await universalReverseGeocode(lat, lng);
      const parts = address.split(',');
      // Take up to the first 3 or 4 descriptive segments, filtering out empty ones
      const displayAddress = parts.slice(0, Math.min(parts.length, 3)).join(',').trim();
      setCurrentAddress(displayAddress);
      addressRef.current = displayAddress; // CRITICAL: Update ref for dispatch
    } catch (err) {
      console.warn('Geocoding error:', err);
    }
  };

  // Get location and media on mount
  useEffect(() => {
    // Location
    // Media (Camera & Mic) initialization
    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: true 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setRecording(true);
        setMediaError(null);
        
        // Setup MediaRecorder
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.start(1000); // Capture in 1s chunks
      } catch (err) {
        console.error('Failed to access media:', err);
        setMediaError(err.name === 'NotAllowedError' ? 'Permission Denied' : 'Camera/Mic Error');
        setRecording(false);
      }
    }

    startMedia();

    return () => {
      // Cleanup tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Build real contacts list from user's emergency contacts
  const contacts = (user?.emergencyContacts || []).map(c => ({
    ...c,
    initials: getInitials(c.name),
    color: colorFromName(c.name),
  }));

  // Countdown phase
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
    if (phase === 'countdown' && countdown === 0) {
      setPhase('active');
      setRecording(true);
      setActivationDate(new Date());
    }
  }, [phase, countdown]);

  // Active phase: send alerts to contacts
  useEffect(() => {
    if (phase !== 'active') return;

    // Use refs to avoid stale closures — always reads latest GPS data
    const waitForLocation = (timeoutMs = 8000) => new Promise((resolve) => {
      if (locationRef.current) { resolve(); return; }
      const start = Date.now();
      const check = setInterval(() => {
        if (locationRef.current || Date.now() - start > timeoutMs) {
          clearInterval(check);
          resolve();
        }
      }, 300);
    });

    const triggerRealAlerts = async () => {
      // READ LATEST DATA INSTANTLY — NO WAITING
      const finalCoords = locationRef.current;
      const finalAddress = addressRef.current !== 'Detecting...' ? addressRef.current : null;

      // Respect user's SOS Notification preference
      if (user?.sosNotifications === false) {
        try {
          const res = await api.post('/emergency/panic', {
            locationLabel: finalAddress || 'Acquiring precise location...',
            skipNotifications: true,
            location: finalCoords ? { latitude: finalCoords.lat, longitude: finalCoords.lng } : undefined
          });
          if (res?.incidentId) setActiveIncidentId(res.incidentId);
        } catch (err) {
          console.error('Failed to trigger silent SOS:', err);
        }
        return;
      }

      try {
        const res = await api.post('/emergency/panic', {
          locationLabel: finalAddress || 'Acquiring precise location...',
          location: finalCoords ? { latitude: finalCoords.lat, longitude: finalCoords.lng } : undefined
        });
        if (res?.incidentId) setActiveIncidentId(res.incidentId);
        if (res?.trackId) setActiveTrackId(res.trackId);
        setAlertsSent(contacts.map(c => c.id));
        setMediaError(null);
      } catch (err) {
        console.error('CRITICAL: Failed to trigger SOS dispatch:', err);
        setMediaError('Network Error: Dispatch failed.');
      }
    };

    triggerRealAlerts();

    // Elapsed timer
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    return () => clearInterval(intervalRef.current);
  }, [phase]);

  // ── PRE-WARMING & LIVE LOCATION BROADCASTING ──
  // Starts on mount to ensure pinpoint accuracy by the time countdown hits 0
  useEffect(() => {
    let watchId = null;
    let lastSent = 0;
    const isGeocoding = { current: false };

    // POWER-UP: Try to grab an immediate location from ANY source (Cache/Wi-Fi/Cell)
    const getImmediateFix = async () => {
      try {
        // Tier 1: Cached (Ultra Fast)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!locationRef.current) {
               console.log('📍 Cached fixed used');
               const { latitude, longitude } = pos.coords;
               setLocationCoords({ lat: latitude, lng: longitude });
               locationRef.current = { lat: latitude, lng: longitude };
               fetchCurrentAddress(latitude, longitude);
            }
          }, null, { enableHighAccuracy: false, timeout: 2000, maximumAge: 60000 }
        );

        // Tier 2: Wi-Fi/Cell (5s - Better Indoors)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!locationRef.current || pos.coords.accuracy < 1000) {
               console.log('📍 Wi-Fi/Cell fix acquired');
               const { latitude, longitude } = pos.coords;
               setLocationCoords({ lat: latitude, lng: longitude });
               locationRef.current = { lat: latitude, lng: longitude };
               fetchCurrentAddress(latitude, longitude);
            }
          }, null, { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
        );
      } catch (e) {
        console.warn('Fast fixes failed.');
      }
    };
    getImmediateFix();

    if (navigator.geolocation) {
      console.log('📡 GPS Pre-warming Started...');
      const startWatch = (isHigh) => {
        return navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            console.log(`📍 GPS Watch (${isHigh ? 'High' : 'Low'}): ${accuracy.toFixed(1)}m`);
            
            setLocationCoords({ lat: latitude, lng: longitude });
            locationRef.current = { lat: latitude, lng: longitude };
            
            if (!isGeocoding.current && (addressRef.current === 'Detecting...' || addressRef.current === 'Unknown Location')) {
              isGeocoding.current = true;
              fetchCurrentAddress(latitude, longitude).finally(() => { isGeocoding.current = false; });
            }

            if (phaseRef.current === 'active') {
               const now = Date.now();
               if (!hasSentPinpointRef.current && accuracy < 100) {
                 hasSentPinpointRef.current = true;
                 console.log(`🎯 GPS Lock acquired (${accuracy.toFixed(1)}m). Updating contacts...`);
                 api.post('/emergency/panic', {
                   locationLabel: addressRef.current !== 'Detecting...' ? addressRef.current : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
                   location: { latitude, longitude },
                   incidentId: activeIncidentId,
                   isUpdate: true 
                 }).catch(() => {});
               }
               if (now - lastSent > 5000) {
                 lastSent = now;
                 api.post('/emergency/location', { lat: latitude, lng: longitude }).catch(() => {});
               }
            }
          },
          (err) => {
            console.warn(`GPS Error (${isHigh ? 'High' : 'Low'}):`, err.message);
            if (isHigh && watchId !== null) {
              navigator.geolocation.clearWatch(watchId);
              watchId = startWatch(false);
            }
          },
          { enableHighAccuracy: isHigh, timeout: 10000, maximumAge: 0 }
        );
      };
      watchId = startWatch(true);
    }

    return () => {
      if (watchId !== null) {
        console.log('📡 GPS Watch Stopped');
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []); // Static hook: GPS remains active throughout the session

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleCancel = async () => {
    // 1. Reset storage immediately to prevent loop on reload
    localStorage.removeItem('sahasya_active_incident_id');
    localStorage.removeItem('sahasya_active_track_id');
    localStorage.removeItem('sahasya_sos_start_time');
    
    clearInterval(intervalRef.current);
    setRecording(false);
    
    // Stop recording and capture final chunks
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Save to Incident Vault if it was actually activated
    if (phase === 'active') {
      // 1. Stop tracking session on backend
      if (activeTrackId) {
        api.post(`/emergency/tracking/${activeTrackId}/stop`).catch(() => {});
      }

      const cancelDate = new Date();
      const triggerDate = activationDate || new Date(cancelDate.getTime() - (elapsed * 1000));
      const preBufferDate = new Date(triggerDate.getTime() - 5000);
      const mediaStartDate = new Date(triggerDate.getTime() + 1000);

      const getTimeString = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

      const generatedTimeline = [
        { time: getTimeString(preBufferDate), event: 'Pre-buffer captured (5s)' },
        { time: getTimeString(triggerDate), event: `SOS Triggered at ${currentAddress}` },
        { time: getTimeString(mediaStartDate), event: 'Audio/Video Recording started' },
        { time: getTimeString(cancelDate), event: 'Emergency Cancelled by user' }
      ];
      
      try {
        if (activeIncidentId) {
          await api.post(`/evidence/${activeIncidentId}/timeline`, { 
            timeline: generatedTimeline,
            durationSeconds: elapsed
          });
          console.log('Timeline recorded securely to vault.');
        }
      } catch (err) {
        console.warn('Failed to sync timeline to vault:', err);
      }
      
      try {
        // 1. If we have recorded data, upload it to the EXISTING incident
        if (chunksRef.current.length > 0 && activeIncidentId) {
          console.log(`Uploading ${chunksRef.current.length} media chunks...`);
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const file = new File([blob], `sos_evidence_${Date.now()}.webm`, { type: 'video/webm' });
          
          const formData = new FormData();
          formData.append('file', file);
          formData.append('incidentId', activeIncidentId);
          formData.append('mediaType', 'video');
          
          await api.upload('/evidence/upload', formData);
          console.log('Evidence uploaded successfully');
        }
      } catch (err) {
        console.error('Critical Error saving SOS evidence:', err);
      }
    }

    // Reset local state & refs
    setActiveIncidentId(null);
    setActiveTrackId(null);
    setActivationDate(null);
    locationRef.current = null;
    addressRef.current = 'Detecting...';
    
    onCancel();
  };

  if (phase === 'countdown') {
    return (
      <div className="fixed inset-0 bg-sahas-dark flex flex-col items-center justify-center z-50 screen-enter">
        {/* Background pulse */}
        <div
          className="absolute inset-0 opacity-20"
          style={{ background: 'radial-gradient(circle at center, #FF2D55 0%, transparent 60%)' }}
        />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border-2 border-sahas-red/40 flex items-center justify-center mb-6">
            <span className="text-2xl">🚨</span>
          </div>
          <p className="font-syne font-700 text-sahas-soft text-sm uppercase tracking-widest mb-4">
            Emergency Alert Sending In
          </p>
          <div
            className="text-8xl font-syne font-800 text-sahas-red"
            style={{ textShadow: '0 0 40px rgba(255,45,85,0.6)' }}
          >
            {countdown}
          </div>
          <p className="text-sahas-soft font-dm text-sm mt-4 mb-10">
            Audio & video recording will start
          </p>

          <button
            onClick={handleCancel}
            className="px-10 py-3.5 rounded-2xl border border-sahas-muted bg-sahas-card text-sahas-text font-syne font-600 text-sm hover:border-sahas-soft transition-colors"
          >
            ✕ Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-sahas-dark flex flex-col z-50 screen-enter overflow-y-auto pb-8">
      {/* Background */}
      <div
        className="absolute inset-0 opacity-15"
        style={{ background: 'radial-gradient(circle at center top, #FF2D55 0%, transparent 50%)' }}
      />

      <div className="relative z-10 flex flex-col h-full">
        {/* Top Status Bar */}
        <div className="px-5 pt-12 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rec-dot w-3 h-3 rounded-full bg-sahas-red" />
              <span className="font-syne font-700 text-sahas-red text-sm uppercase tracking-widest">SOS Active</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-sahas-card border border-sahas-border">
              <span className="font-dm text-sm text-sahas-text tabular-nums">{formatTime(elapsed)}</span>
            </div>
          </div>
        </div>

        {/* Core: Video Preview */}
        <div className="flex flex-col items-center py-6 px-5">
          <div className="relative w-full max-w-[320px] aspect-[3/4] mb-8 group">
            <div className={`absolute inset-0 rounded-3xl overflow-hidden shadow-2xl border-2 transition-all duration-500 ${recording ? 'border-sahas-red/40' : 'border-sahas-border'}`}>
              {recording ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]" // Mirror user camera
                />
              ) : (
                <div className="w-full h-full bg-sahas-card flex flex-col items-center justify-center p-6 text-center">
                  <span className="text-4xl mb-3">{mediaError === 'Permission Denied' ? '🚫' : '📹'}</span>
                  <p className="text-sm font-dm text-sahas-soft leading-tight">
                    {mediaError || 'Initializing Camera...'}
                  </p>
                </div>
              )}
              
              {/* Status Overlays */}
              <div className="absolute inset-x-0 top-0 p-4 bg-gradient-to-b from-black/40 to-transparent flex justify-between items-start">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
                   <span className={`w-1.5 h-1.5 rounded-full ${recording ? 'bg-sahas-red animate-pulse' : 'bg-sahas-muted'}`} />
                   <span className="text-[10px] font-syne font-700 text-white uppercase tracking-widest">Live Capture</span>
                </div>
                <div className="px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
                   <span className="text-[10px] font-dm text-white tabular-nums">{formatTime(elapsed)}</span>
                </div>
              </div>
              
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/40 to-transparent">
                 <p className="text-[10px] font-dm text-white/70 uppercase tracking-widest text-center">Cloud Sync Active</p>
              </div>
            </div>
            
            {/* Visual glow behind video */}
            <div className={`absolute -inset-4 bg-sahas-red/5 blur-2xl rounded-full -z-10 transition-opacity duration-1000 ${recording ? 'opacity-100' : 'opacity-0'}`} />
          </div>

          {/* Recording indicators */}
          <div className="flex gap-4 mb-6">
            {[
              { icon: '🎙️', label: 'Audio', active: recording },
              { icon: '📹', label: 'Video', active: recording },
              { icon: '📍', label: 'Location', active: true },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1.5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
                  item.active
                    ? 'bg-sahas-red/15 border-sahas-red/40'
                    : 'bg-sahas-card border-sahas-border'
                }`}>
                  <span className="text-xl">{item.icon}</span>
                </div>
                <div className="flex items-center gap-1">
                  {item.active && <span className="w-1.5 h-1.5 rounded-full bg-sahas-red rec-dot" />}
                  <span className="text-[10px] font-dm text-sahas-soft">{item.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Evidence Timeline */}
          <div className="w-full bg-sahas-card border border-sahas-border rounded-2xl p-4 mb-4">
            <p className="text-xs font-dm text-sahas-soft mb-3 uppercase tracking-wider">Evidence Timeline</p>
            <div className="space-y-2">
              {[
                { time: activationDate ? new Date(activationDate.getTime() - 5000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : '--:--', event: 'Pre-buffer captured (5s)', done: true },
                { time: activationDate ? activationDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : '--:--', event: 'SOS Triggered', done: true },
                { time: activationDate ? new Date(activationDate.getTime() + 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : '--:--', event: 'Recording started', done: elapsed > 1 },
                { time: activationDate ? new Date(activationDate.getTime() + elapsed * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : '--:--', event: `Location: ${currentAddress}`, done: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.done ? 'bg-sahas-red' : 'bg-sahas-muted'}`} />
                  <span className="text-xs font-dm text-sahas-soft tabular-nums min-w-[75px]">{item.time}</span>
                  <span className={`text-xs font-dm flex-1 ${item.done ? 'text-sahas-text' : 'text-sahas-muted'}`}>
                    {item.event}
                  </span>
                  {item.done && <span className="text-xs text-sahas-green">✓</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alert Status */}
        <div className="px-5 mb-4">
          <p className="text-xs font-dm text-sahas-soft mb-3 uppercase tracking-wider">Alert Status</p>
          <div className="space-y-2">
            {contacts.length === 0 ? (
              <div className="p-4 rounded-xl bg-sahas-card border border-dashed border-sahas-muted text-center">
                <p className="text-xs font-dm text-sahas-soft">No emergency contacts set.</p>
                <p className="text-xs font-dm text-sahas-muted mt-1">Add contacts in your Profile to alert them during SOS.</p>
              </div>
            ) : (
              contacts.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-sahas-card border border-sahas-border">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-syne font-700 flex-shrink-0"
                    style={{ background: `${c.color}20`, color: c.color, border: `1.5px solid ${c.color}40` }}
                  >
                    {c.initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-dm text-sahas-text">{c.name}</p>
                    <p className="text-xs font-dm text-sahas-soft">{c.phone}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!c.telegram_chat_id ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-sahas-red" />
                        <span className="text-[10px] sm:text-xs font-dm text-sahas-red font-bold">Failed - Not Linked</span>
                      </>
                    ) : alertsSent.includes(c.id) ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-sahas-green" />
                        <span className="text-[10px] sm:text-xs font-dm text-sahas-green">Message Sent</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-sahas-amber animate-pulse" />
                        <span className="text-[10px] sm:text-xs font-dm text-sahas-amber">Sending…</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cancel Button */}
        <div className="px-5 mt-auto">
          <button
            onClick={handleCancel}
            className="w-full py-4 rounded-2xl border border-sahas-muted bg-sahas-card text-sahas-soft font-syne font-600 text-sm hover:border-sahas-red/40 hover:text-sahas-red transition-all active:scale-98"
          >
            ✕ Cancel Emergency
          </button>
          <p className="text-center text-xs font-dm text-sahas-muted mt-3">
            Evidence is secured even if alert is cancelled
          </p>
        </div>
      </div>
    </div>
  );
}
