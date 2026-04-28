import React, { useState } from 'react';
import { Toast } from '../components/UI.jsx';
import { useIncidents } from '../hooks/useIncidents.js';
import { useAuth } from '../hooks/useAuth.js';

export default function EvidenceVaultScreen({ onNavigateToIncident, onReportIncident, user }) {
  const { incidents, deleteIncident, loading: fetching, refresh } = useIncidents(user);
  const { verifyPassword } = useAuth();
  
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  
  // Lock State (Restored but without emoji)
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);
    const isValid = await verifyPassword(password);
    if (isValid) {
      setIsUnlocked(true);
    } else {
      setError('Incorrect account password.');
    }
    setIsVerifying(false);
    setPassword('');
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-sahas-dark flex flex-col items-center justify-center px-6 pb-28">
        <div className="w-full max-w-sm animate-scale-in">
          <div className="text-center mb-8">
            <p className="text-sahas-soft text-[10px] font-dm tracking-[0.2em] uppercase font-800">Protected</p>
            <h2 className="font-syne font-900 text-3xl text-sahas-text mt-1">Verify Identity</h2>
            <p className="font-dm text-sm text-sahas-soft mt-2 leading-relaxed">
              Confirm your password to access secure evidence vault
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <input 
              type="password" 
              placeholder="Account Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-sahas-card border border-sahas-border rounded-2xl px-5 py-4 text-sm font-dm text-sahas-text outline-none focus:border-sahas-red/40 transition-all"
              autoFocus
            />
            {error && <p className="text-xs text-sahas-red font-dm text-center animate-shake">{error}</p>}
            
            <button 
              type="submit" 
              disabled={isVerifying}
              className="w-full py-4 rounded-2xl bg-sahas-red text-white font-syne font-bold text-xs uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all mt-2"
            >
              {isVerifying ? 'Verifying...' : 'Unlock Vault'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sahas-dark noise pb-28">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Header */}
      <div className="px-5 pt-4 pb-6">
        <p className="text-sahas-soft text-[10px] font-dm tracking-[0.2em] uppercase font-800">Security</p>
        <h1 className="font-syne font-900 text-3xl text-sahas-text mt-1">
          Evidence Vault <span className="text-sahas-red">.</span>
        </h1>
        <p className="text-sahas-soft text-[11px] font-dm mt-2 leading-relaxed">
          Your securely recorded incident logs and captured media
        </p>
        
        <button 
          onClick={refresh}
          className="mt-4 px-4 py-2 rounded-2xl bg-sahas-card border border-sahas-border shadow-sm text-[10px] font-dm text-sahas-teal flex items-center gap-2 hover:border-sahas-teal/40 transition-all active:scale-95 font-bold uppercase tracking-widest"
        >
          <span>🔄</span> Refresh Records
        </button>
      </div>

      {/* Delete Confirmation Overlay */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className="w-full max-w-xs rounded-3xl p-6 shadow-2xl bg-sahas-card border border-sahas-red/30 animate-scale-in">
            <div className="text-center mb-5">
              <span className="text-3xl mb-2 block">🗑️</span>
              <h3 className="font-syne font-bold text-lg text-sahas-text">Delete Incident</h3>
              <p className="font-dm text-xs text-sahas-soft mt-1">
                Are you sure you want to permanently delete all evidence for this incident?
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-xl font-dm text-xs text-sahas-soft border border-sahas-border bg-transparent">Cancel</button>
              <button onClick={() => { deleteIncident(deleteTarget); setDeleteTarget(null); }} className="flex-1 py-3 rounded-xl font-dm font-semibold text-xs text-white bg-sahas-red">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Records List */}
      <div className="px-5 mb-5 space-y-4">
        {fetching ? (
          <div className="py-12 text-center">
             <div className="w-10 h-10 border-2 border-sahas-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
             <p className="text-sahas-soft font-dm text-[11px] font-bold uppercase tracking-widest">Fetching Records...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-sahas-border rounded-3xl bg-sahas-card/50">
            <span className="text-4xl mb-4 block">🗄️</span>
            <p className="text-sahas-soft font-dm text-xs font-bold uppercase tracking-widest">No incidents recorded yet</p>
            <button onClick={refresh} className="text-sahas-teal text-[10px] mt-4 font-bold uppercase tracking-[0.2em] hover:underline">Check again</button>
          </div>
        ) : (
          incidents.map((incident) => (
            <div 
              key={incident.id}
              onClick={() => onNavigateToIncident(incident.id)}
              className="bg-sahas-card border border-sahas-border rounded-3xl p-5 shadow-lg active:scale-[0.98] transition-all cursor-pointer hover:border-sahas-muted"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-dm text-sahas-red font-900 uppercase tracking-widest">
                  {incident.type}
                </span>
                <span className="text-[9px] font-dm text-sahas-soft font-bold uppercase">
                  {new Date(incident.date).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-sahas-dark flex items-center justify-center text-xl border border-sahas-border flex-shrink-0">
                  {incident.type === 'SOS Triggered' ? '🚨' : '🛡️'}
                </div>
                <div className="min-w-0">
                  <p className="font-syne font-800 text-sahas-text text-sm truncate uppercase tracking-tight">{incident.location}</p>
                  <p className="text-[10px] font-dm text-sahas-soft truncate mt-0.5">{incident.summary || 'Incident log recorded successfully.'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-sahas-border/30">
                <div className="flex gap-2">
                  {incident.evidence?.length > 0 ? (
                    <>
                      <span className="w-7 h-7 rounded-lg bg-sahas-dark border border-sahas-border flex items-center justify-center text-[10px] opacity-60">🎙️</span>
                      <span className="w-7 h-7 rounded-lg bg-sahas-dark border border-sahas-border flex items-center justify-center text-[10px] opacity-60">📹</span>
                    </>
                  ) : (
                    <span className="w-auto px-2 h-7 rounded-lg bg-sahas-dark border border-sahas-border flex items-center justify-center text-[9px] font-dm text-sahas-muted uppercase tracking-widest opacity-60">No Media</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onReportIncident(incident); }}
                    className="text-[10px] font-dm font-bold text-sahas-teal uppercase tracking-widest hover:underline"
                  >
                    Report
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(incident.id); }}
                    className="text-sahas-soft hover:text-sahas-red transition-colors text-xs"
                  >
                    🗑️
                  </button>
                  <div className="w-7 h-7 rounded-full bg-sahas-red/10 border border-sahas-red/20 flex items-center justify-center text-sahas-red text-[10px]">
                    →
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
