import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Toggle, Toast } from '../components/UI.jsx';
import { useIncidents } from '../hooks/useIncidents.js';
import { useAuth } from '../hooks/useAuth.js';
import { GoogleMap, Marker, Autocomplete, useGoogleMaps, DARK_MAP_STYLE, MapPlaceholder, reverseGeocode as universalReverseGeocode } from '../components/GoogleMapProvider.jsx';

const INCIDENT_TYPES = [
  'SOS Triggered',
  'Stalking / Following',
  'Verbal Harassment',
  'Physical Assault',
  'Indecent Exposure',
  'Cyberbullying',
  'Domestic Violence',
  'Other',
];

const ESCALATION_LEVELS = [
  { id: 'store', label: 'Secure Storage Only', desc: 'Evidence stored, not shared', icon: '🛡️', color: 'sahas-teal' },
  { id: 'contacts', label: 'Share with Trusted', desc: 'Send to your emergency contacts', icon: '👥', color: 'sahas-amber' },
  { id: 'authority', label: 'Escalate to Authorities', desc: 'File with police / NGO', icon: '⚖️', color: 'sahas-red' },
];

const REPORT_MAP_STYLE = { width: '100%', height: '10rem' };

const reportMapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'greedy',
  clickableIcons: false,
};

export default function ReportScreen({ user, prefill, onClearPrefill }) {
  const { isLoaded, loadError } = useGoogleMaps();
  const { updateProfile } = useAuth();
  const { incidents, loading, saveIncident: saveReport, deleteIncident, refresh } = useIncidents(user, 'reports');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [anonymous, setAnonymous] = useState(true);
  const [incidentType, setIncidentType] = useState('');
  const [description, setDescription] = useState('');
  const [manualStatement, setManualStatement] = useState('');
  const [includeMedia, setIncludeMedia] = useState(true);
  const [hasMedia, setHasMedia] = useState(false);
  const [location, setLocation] = useState('');
  const [locationCoords, setLocationCoords] = useState(null);
  const [locationAutocomplete, setLocationAutocomplete] = useState(null);
  const reportMapRef = useRef(null);

  const onReportMapLoad = useCallback((map) => {
    reportMapRef.current = map;
  }, []);

  const handleMapPick = useCallback((e) => {
    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setLocationCoords(pos);
    
    const fetchAddress = async () => {
      try {
        const fullAddress = await universalReverseGeocode(pos.lat, pos.lng);
        const parts = fullAddress.split(',');
        const short = parts.slice(0, 3).join(',').trim();
        setLocation(short);
      } catch (err) {
        setLocation(`${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
      }
    };
    fetchAddress();
  }, [isLoaded]);

  const onPlaceChanged = () => {
    if (locationAutocomplete !== null) {
      const place = locationAutocomplete.getPlace();
      if (place.geometry) {
        const pos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setLocationCoords(pos);
        setLocation(place.formatted_address || place.name);
        if (reportMapRef.current) {
          reportMapRef.current.panTo(pos);
          reportMapRef.current.setZoom(16);
        }
      }
    }
  };

  const [escalation, setEscalation] = useState('store');
  const [submitted, setSubmitted] = useState(false);
  const [reportId, setReportId] = useState('');
  const [activeTab, setActiveTab] = useState('new'); 
  const [toast, setToast] = useState(null);

  // Lock State (Restored but without emoji)
  const { verifyPassword } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [vaultError, setVaultError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setVaultError('');
    setIsVerifying(true);
    const isValid = await verifyPassword(password);
    if (isValid) {
      setIsUnlocked(true);
    } else {
      setVaultError('Incorrect account password. Please try again.');
    }
    setIsVerifying(false);
  };

  // Prefill Logic
  useEffect(() => {
    if (prefill) {
      setActiveTab('new');
      setIncidentType(prefill.type || '');
      setLocation(prefill.location || '');
      const dateStr = new Date(prefill.date).toLocaleDateString();
      const timeStr = new Date(prefill.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const durationStr = `${Math.floor(prefill.durationSeconds / 60)}m ${prefill.durationSeconds % 60}s`;

      // Build a comprehensive, formatted report text from the Vault Evidence
      const timelineText = prefill.timeline && prefill.timeline.length > 0 
        ? prefill.timeline.map(t => `${t.time}  |  ${t.event}`).join('\n')
        : 'No timeline available.';

      const summaryText = prefill.summary || 'No automated audio/video analysis available for this incident.';

      setHasMedia(prefill.evidence && prefill.evidence.length > 0);
      setIncludeMedia(true);

      setDescription(
        `=======================================\n` +
        `[ AUTOMATED EVIDENCE LOG ]\n` +
        `=======================================\n` +
        `Type         : ${prefill.type || 'Emergency Alert'}\n` +
        `Timestamp    : ${dateStr} at ${timeStr}\n` +
        `GPS Location : ${prefill.location || 'Not specified'}\n` +
        `Duration     : ${durationStr}\n\n` +
        `-- AI SYSTEM SUMMARY --\n${summaryText}\n\n` +
        `-- SYSTEM TIMELINE --\n${timelineText}`
      );
      onClearPrefill();
    }
  }, [prefill, onClearPrefill]);

  const handleSubmit = async () => {
    if (!incidentType || !manualStatement || !location) {
      setToast({ msg: 'Please fill in incident type, statement, and location', type: 'warning' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const finalDescription = manualStatement + (description ? `\n\n${description}` : '');
      const finalEvidence = hasMedia && includeMedia && prefill?.evidence ? prefill.evidence : [];

      const payload = {
        type: incidentType,
        location: location || 'Not specified',
        description: finalDescription,
        evidence: finalEvidence,
        anonymous,
        timeline: [
          { time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }), event: 'Manual Report Created' },
        ]
      };

      console.log('📡 Sending Report Payload:', payload);
      const result = await saveReport(payload);
      console.log('🎉 API Response:', result);
      setReportId(result.id || 'RPT-' + Math.random().toString(36).substr(2, 6).toUpperCase());
      
      // Wait a moment for DB to normalize before refreshing history
      setTimeout(() => {
        refresh();
      }, 1000);

      setSubmitted(true);
    } catch (err) {
      setToast({ msg: 'Failed to submit report. Please try again.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setIncidentType('');
    setDescription('');
    setManualStatement('');
    setLocation('');
    setEscalation('store');
    setAnonymous(true);
  };

  const renderHistoryTab = () => {
    if (!isUnlocked) {
      return (
        <div className="px-6 py-8 flex flex-col items-center justify-center animate-scale-in">
           <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <h2 className="font-syne font-bold text-xl text-sahas-text">Verify Identity</h2>
              <p className="font-dm text-sm text-sahas-soft mt-1">Enter your account password to manage your reports</p>
            </div>
            <form onSubmit={handleUnlock} className="space-y-4">
              <input 
                type="password" 
                placeholder="Enter Account Password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-sahas-card border border-sahas-border rounded-xl px-4 py-3 text-sm font-dm text-sahas-text outline-none focus:border-sahas-red"
                autoFocus
              />
              {vaultError && <p className="text-xs text-sahas-red font-dm text-center">{vaultError}</p>}
              <button 
                type="submit" 
                disabled={isVerifying}
                className="w-full py-3.5 rounded-xl bg-sahas-red text-white font-dm font-bold mt-2 hover:bg-sahas-red/90 transition-colors disabled:opacity-50"
              >
                {isVerifying ? 'Verifying...' : 'Unlock'}
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="px-5">
        <div className="flex justify-between items-center mb-4 px-1">
          <p className="text-[10px] font-dm text-sahas-soft uppercase tracking-widest font-800">Your Records</p>
          <button 
            onClick={refresh}
            disabled={loading}
            className="text-[10px] font-dm text-sahas-teal uppercase tracking-widest font-800 flex items-center gap-1.5 hover:opacity-70 transition-opacity disabled:opacity-50"
          >
            <span className={`${loading ? 'animate-spin' : ''}`}>🔄</span> 
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="space-y-3">
          {loading && incidents.length === 0 ? (
            <p className="text-center text-sahas-soft font-dm text-sm py-10 italic">Loading reports...</p>
          ) : incidents.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-sahas-muted rounded-2xl bg-sahas-card">
              <span className="text-3xl mb-2 opacity-60">📑</span>
              <p className="text-sahas-soft font-dm text-sm">No reports filed yet</p>
              <button onClick={refresh} className="text-sahas-teal text-[10px] mt-4 font-bold uppercase tracking-[0.2em] hover:underline">Check again</button>
            </div>
          ) : (
            incidents.map((inc) => (
              <Card key={inc.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-syne font-700 text-sm text-sahas-text">{inc.type}</p>
                    <p className="text-xs font-dm text-sahas-soft">{new Date(inc.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-dm px-2 py-0.5 rounded-full border bg-sahas-amber/20 border-sahas-amber/30 text-sahas-amber">Submitted</span>
                    <button onClick={() => setDeleteTarget(inc.id)} className="text-sahas-red/70 hover:text-sahas-red">🗑️</button>
                  </div>
                </div>
                <p className="text-xs font-dm text-sahas-soft">📍 {inc.location}</p>
                <p className="mt-2 text-xs font-dm text-sahas-text line-clamp-2 italic">{inc.summary}</p>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-sahas-dark noise screen-enter pb-28">
        <div className="px-5 pt-12 pb-6">
          <p className="text-sahas-soft text-xs font-dm tracking-widest uppercase">Report</p>
          <h1 className="font-syne font-800 text-2xl text-sahas-text mt-0.5">Submitted <span className="text-sahas-red">.</span></h1>
        </div>
        <div className="px-5">
          <div className="p-8 rounded-3xl bg-gradient-to-br from-sahas-green/10 to-sahas-teal/5 border border-sahas-green/20 text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-sahas-green/20 border border-sahas-green/30 flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">✅</div>
            <h2 className="font-syne font-700 text-sahas-green text-xl mb-1">Report Secured</h2>
            <p className="text-sahas-soft font-dm text-sm mb-6">{anonymous ? 'Submitted anonymously' : 'Submitted with your profile'}</p>
            
            <div className="bg-sahas-dark/40 border border-sahas-border py-4 px-6 rounded-2xl shadow-inner inline-block min-w-[200px]">
              <p className="text-[10px] uppercase tracking-[0.2em] text-sahas-soft mb-1.5 font-800">Tracking Reference</p>
              <p className="text-lg font-dm font-700 text-sahas-text tracking-wider uppercase">
                RPT-{reportId.substring(0, 8)}
              </p>
            </div>
          </div>
          <button onClick={handleReset} className="w-full py-4 rounded-2xl border border-sahas-border bg-sahas-card text-sahas-soft font-dm font-600 hover:bg-sahas-border/30 transition-all">Submit Another Report</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sahas-dark noise screen-enter pb-28">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="px-5 pt-4 pb-4">
        <p className="text-sahas-soft text-xs font-dm tracking-widest uppercase">Justice</p>
        <h1 className="font-syne font-800 text-2xl text-sahas-text mt-0.5">Report <span className="text-sahas-red">.</span></h1>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-6">
          <div className="w-full max-w-xs rounded-3xl p-6 shadow-2xl bg-sahas-card border border-sahas-red/30 animate-scale-in">
            <div className="text-center mb-5">
              <span className="text-3xl mb-2 block">🗑️</span>
              <h3 className="font-syne font-bold text-lg text-sahas-text">Delete Report</h3>
              <p className="font-dm text-sm text-sahas-soft mt-1">Permanently delete this report history?</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-xl border border-sahas-border">Cancel</button>
              <button onClick={async () => { await deleteIncident(deleteTarget); setDeleteTarget(null); setToast({ msg: 'Report deleted', type: 'info' }); }} className="flex-1 py-3 rounded-xl font-dm font-semibold text-white bg-sahas-red">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 mb-5">
        <div className="flex p-1 bg-sahas-card border border-sahas-border rounded-2xl">
          {[{ id: 'new', label: '+ New Report' }, { id: 'history', label: 'My Reports' }].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => {
                if (activeTab === 'history' && tab.id !== 'history') {
                  setIsUnlocked(false);
                  setPassword('');
                }
                setActiveTab(tab.id);
              }} 
              className={`flex-1 py-2.5 rounded-xl text-sm font-dm font-medium transition-all ${activeTab === tab.id ? 'bg-sahas-red text-white' : 'text-sahas-soft'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'history' ? renderHistoryTab() : (
        <div className="px-5 space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-dm text-sm text-sahas-text">Submit Anonymously</p>
                <p className="text-xs font-dm text-sahas-soft mt-0.5">Stays hidden from authorities</p>
              </div>
              <Toggle enabled={anonymous} onChange={setAnonymous} />
            </div>
          </Card>

          <div>
            <p className="text-xs font-dm text-sahas-soft mb-2 uppercase tracking-wider">Incident Type *</p>
            <div className="flex flex-wrap gap-2">
              {INCIDENT_TYPES.map((type) => (
                <button key={type} onClick={() => setIncidentType(type)} className={`px-3 py-1.5 rounded-xl text-xs font-dm font-medium ${incidentType === type ? 'bg-sahas-red text-white' : 'bg-sahas-card border border-sahas-border text-sahas-soft'}`}>{type}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-dm text-sahas-soft mb-2 uppercase tracking-wider">Manual Statement *</p>
            <textarea value={manualStatement} onChange={e => setManualStatement(e.target.value)} className="w-full bg-sahas-card border border-sahas-border rounded-2xl px-4 py-3 text-sm font-dm text-sahas-text outline-none focus:border-sahas-red/30 h-32" placeholder="Please type your detailed account of the incident here..." />
          </div>

          <div>
            <p className="text-xs font-dm text-sahas-soft mb-2 flex items-center justify-between uppercase tracking-wider">
              Description *
              {description && <span className="text-[9px] text-sahas-teal font-bold normal-case tracking-wider">Auto-filled from Vault</span>}
            </p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              readOnly={false}
              className={`w-full bg-sahas-card border-sahas-border rounded-2xl px-4 py-4 text-[13px] font-dm outline-none h-32 font-mono tracking-tight ${
                description ? 'border-dashed text-sahas-soft' : 'border text-sahas-text focus:border-sahas-red/30'
              }`}
              placeholder="Add detailed description of the incident..."
            />
          </div>

          {hasMedia && (
            <Card className="p-4 border border-sahas-teal/30 bg-sahas-teal/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sahas-teal/20 flex items-center justify-center flex-shrink-0">🛡️</div>
                  <div>
                    <p className="font-dm text-sm text-sahas-text">Attach Media Evidence</p>
                    <p className="text-[10px] font-dm text-sahas-soft mt-0.5">Include recorded Audio & Video payloads with this report.</p>
                  </div>
                </div>
                <Toggle enabled={includeMedia} onChange={setIncludeMedia} />
              </div>
            </Card>
          )}

          <div>
            <p className="text-xs font-dm text-sahas-soft mb-2 uppercase tracking-wider">📍 Location *</p>
            <div className="mb-3 rounded-2xl overflow-hidden border border-sahas-border bg-sahas-card">
              {!isLoaded ? <div style={{ height: '10rem' }}><MapPlaceholder loadError={loadError} /></div> : (
                <GoogleMap mapContainerStyle={REPORT_MAP_STYLE} center={locationCoords || { lat: 19.076, lng: 72.877 }} zoom={locationCoords ? 15 : 12} options={reportMapOptions} onClick={handleMapPick} onLoad={onReportMapLoad}>
                  {locationCoords && <Marker position={locationCoords} type="danger" />}
                </GoogleMap>
              )}
            </div>
            
            <div className="relative">
              {isLoaded ? (
                <Autocomplete onLoad={setLocationAutocomplete} onPlaceChanged={onPlaceChanged}>
                  <input value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-sahas-card border border-sahas-border rounded-2xl px-4 py-3 text-sm font-dm text-sahas-text outline-none focus:border-sahas-red/30" placeholder="Search location" />
                </Autocomplete>
              ) : (
                <input value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-sahas-card border border-sahas-border rounded-2xl px-4 py-3 text-sm font-dm text-sahas-text outline-none focus:border-sahas-red/30" placeholder="Search location" />
              )}
            </div>
          </div>



          <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-4 rounded-2xl bg-gradient-to-r from-sahas-red to-sahas-orange text-white font-syne font-700 text-sm active:scale-98 transition-all disabled:opacity-50">
            {isSubmitting ? 'Submitting...' : anonymous ? '🕵️ Submit Anonymously' : '📋 Submit Report'}
          </button>
        </div>
      )}
    </div>
  );
}
