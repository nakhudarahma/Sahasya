import React, { useState, useEffect } from 'react';
import { Card } from '../components/UI.jsx';
import { useIncidents } from '../hooks/useIncidents.js';
import { api } from '../api.js';

export default function IncidentDetailScreen({ incidentId, onBack, user }) {
  const { getIncidentById, loading } = useIncidents(user);
  const incident = getIncidentById(incidentId);
  const [media, setMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  useEffect(() => {
    if (!incidentId || !user) return;
    setMediaLoading(true);
    api.get(`/evidence/media/${incidentId}`)
      .then(data => setMedia(Array.isArray(data) ? data : []))
      .catch(() => setMedia([]))
      .finally(() => setMediaLoading(false));
  }, [incidentId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-sahas-dark flex flex-col items-center justify-center p-5">
        <div className="w-10 h-10 border-2 border-sahas-teal border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sahas-soft text-xs uppercase tracking-widest font-bold">Decrypting Incident...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-sahas-dark flex items-center justify-center p-5">
        <p className="text-sahas-soft">Incident not found.</p>
        <button onClick={onBack} className="ml-4 text-sahas-teal underline">Go Back</button>
      </div>
    );
  }

  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const videos = media.filter(m => m.mediaType === 'video');
  const audios = media.filter(m => m.mediaType === 'audio');

  return (
    <div className="min-h-screen bg-sahas-dark border-x border-sahas-border pb-28 noise">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-sahas-dark/90 backdrop-blur-md px-5 py-4 border-b border-sahas-border flex items-center gap-4">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-sahas-card border border-sahas-border flex items-center justify-center text-sahas-soft hover:text-sahas-text transition-all active:scale-90"
        >
          ←
        </button>
        <div>
          <h2 className="font-syne font-800 text-lg text-sahas-text tracking-tight uppercase">{incident.id.substring(0, 10)}</h2>
          <p className="text-[10px] font-dm text-sahas-soft font-bold uppercase tracking-widest">{formatDateTime(incident.date)}</p>
        </div>
      </div>

      <div className="p-5 space-y-6">

        {/* Core Metadata */}
        <div className="p-5 rounded-3xl bg-sahas-card border border-sahas-red/30 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sahas-red/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="flex justify-between items-center mb-4 relative z-10">
            <h3 className="font-syne font-800 text-sahas-red text-xl uppercase tracking-tight">{incident.type}</h3>
            <span className="bg-sahas-red/20 text-sahas-red px-3 py-1 rounded-full text-[10px] font-dm font-800 uppercase tracking-tighter border border-sahas-red/30">{incident.durationSeconds}s</span>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <span className="text-sahas-red opacity-80">📍</span>
            <span className="text-xs font-dm font-600 text-sahas-soft">{incident.location}</span>
          </div>
        </div>

        {/* ── VIDEO EVIDENCE ── */}
        <div>
          <p className="text-[10px] font-dm text-sahas-soft mb-3 uppercase tracking-widest font-800 px-1 flex items-center gap-2">
            📹 Recorded Evidence
            {mediaLoading && <span className="w-3 h-3 border border-sahas-soft border-t-transparent rounded-full animate-spin inline-block" />}
          </p>

          {!mediaLoading && videos.length === 0 && audios.length === 0 && (
            <div className="bg-sahas-card border border-dashed border-sahas-border rounded-2xl p-5 text-center">
              <p className="text-2xl mb-2">🎥</p>
              <p className="text-xs font-dm text-sahas-soft">No video evidence recorded for this incident.</p>
              <p className="text-[10px] font-dm text-sahas-muted mt-1">Camera permission must be granted during SOS to capture evidence.</p>
            </div>
          )}

          {videos.map((v, i) => (
            <div key={v.id || i} className="mb-3 bg-sahas-card border border-sahas-border rounded-2xl overflow-hidden">
              <div className="px-4 py-2 border-b border-sahas-border flex items-center justify-between">
                <p className="text-[10px] font-dm text-sahas-soft uppercase tracking-wider">Recording {i + 1}</p>
                <span className="text-[10px] font-dm text-sahas-red border border-sahas-red/30 px-2 py-0.5 rounded-full">🔒 Encrypted</span>
              </div>
              <video
                controls
                className="w-full max-h-[300px] bg-black"
                src={v.signedUrl}
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
              <div className="px-4 py-2 flex items-center justify-between">
                <p className="text-[10px] font-dm text-sahas-muted">
                  {v.size ? `${(v.size / (1024 * 1024)).toFixed(1)} MB` : ''}
                </p>
                <a
                  href={v.signedUrl}
                  download={v.name || `sos_evidence_${i + 1}.webm`}
                  className="text-[10px] font-dm text-sahas-teal hover:underline"
                >
                  ↓ Download
                </a>
              </div>
            </div>
          ))}

          {audios.map((a, i) => (
            <div key={a.id || i} className="mb-3 bg-sahas-card border border-sahas-border rounded-2xl p-4">
              <p className="text-[10px] font-dm text-sahas-soft uppercase tracking-wider mb-2">🎙️ Audio Recording {i + 1}</p>
              <audio controls className="w-full" src={a.signedUrl} preload="metadata" />
            </div>
          ))}
        </div>

        {/* AI Summary */}
        <div>
          <p className="text-[10px] font-dm text-sahas-teal mb-2 uppercase tracking-widest font-800 flex items-center gap-2 px-1">
            ✨ Automated Summary
          </p>
          <div className="bg-sahas-card border border-sahas-border rounded-3xl p-5 shadow-inner">
            <p className="text-xs font-dm text-sahas-text leading-relaxed font-500">
              {incident.summary || "No automated summary available for this incident."}
            </p>
          </div>
        </div>

        {/* Event Timeline */}
        <div>
          <p className="text-[10px] font-dm text-sahas-soft mb-3 uppercase tracking-widest font-800 px-1">Event Timeline</p>
          <div className="w-full bg-sahas-card border border-sahas-border rounded-3xl p-5">
            <div className="space-y-5">
              {incident.timeline && incident.timeline.map((item, i) => (
                <div key={i} className="flex items-start gap-4 group">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-sahas-red shadow-[0_0_10px_rgba(255,45,85,0.6)] group-hover:scale-125 transition-transform" />
                  <span className="text-[10px] font-dm text-sahas-red tabular-nums min-w-[60px] whitespace-nowrap pt-0.5 font-bold tracking-tight">{item.time}</span>
                  <span className="text-xs font-dm flex-1 text-sahas-text font-500 mt-0.5">{item.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Evidence Status */}
        <div className="bg-sahas-card border border-sahas-border rounded-3xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${media.length > 0 ? 'bg-sahas-teal/10' : 'bg-sahas-muted/10'}`}>
                {media.length > 0 ? '🛡️' : '⚠️'}
              </div>
              <div>
                <p className="text-[10px] font-dm text-sahas-soft uppercase tracking-widest font-800">Status</p>
                <p className={`text-xs font-dm font-700 ${media.length > 0 ? 'text-sahas-text' : 'text-sahas-amber'}`}>
                  {media.length > 0 ? `${media.length} file(s) Secured` : 'No Media Evidence Recorded'}
                </p>
              </div>
            </div>
            {media.length > 0 && (
              <div className="flex gap-2">
                {audios.length > 0 && <span className="w-8 h-8 rounded-lg bg-sahas-dark border border-sahas-border flex items-center justify-center text-xs">🎙️</span>}
                {videos.length > 0 && <span className="w-8 h-8 rounded-lg bg-sahas-dark border border-sahas-border flex items-center justify-center text-xs">📹</span>}
              </div>
            )}
          </div>
          {media.length > 0 && (
            <div className="text-xs font-dm text-sahas-teal border border-sahas-teal/20 bg-sahas-teal/5 p-3 rounded-xl text-center shadow-inner">
              Evidence is securely stored and encrypted on Sahasya Cloud. Ready for law enforcement transfer.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
