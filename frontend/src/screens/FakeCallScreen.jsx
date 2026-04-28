import React, { useState, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Web Audio ringtone — classic double-ring pattern, no external files needed
// ---------------------------------------------------------------------------
function createRingtone() {
  let ctx = null;
  let stopped = false;
  let timeoutId = null;

  const start = () => {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {
      return; // Audio not supported
    }

    const playBeep = (freq, startAt, dur) => {
      if (stopped) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startAt);
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.35, startAt + 0.02);
      gain.gain.setValueAtTime(0.35, startAt + dur - 0.02);
      gain.gain.linearRampToValueAtTime(0, startAt + dur);
      osc.start(startAt);
      osc.stop(startAt + dur);
    };

    const scheduleCycle = () => {
      if (stopped || !ctx) return;
      const now = ctx.currentTime;
      // Pattern: RING-RING ... pause ... repeat (classic phone)
      playBeep(440, now + 0.0, 0.35);
      playBeep(480, now + 0.0, 0.35); // harmony
      playBeep(440, now + 0.55, 0.35);
      playBeep(480, now + 0.55, 0.35);
      // Next cycle in 2.5s
      timeoutId = setTimeout(scheduleCycle, 2500);
    };

    scheduleCycle();
  };

  const stop = () => {
    stopped = true;
    clearTimeout(timeoutId);
    try {
      ctx?.close();
    } catch (_) {}
  };

  return { start, stop };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function FakeCallScreen({ caller, onClose }) {
  const [phase, setPhase] = useState('ringing'); // ringing | active | ended
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const ringtoneRef = useRef(null);

  const COLORS = ['#FF6B35', '#00D68F', '#00C4CC', '#9B59B6', '#FFB800', '#7C3AED'];
  const getColorFromName = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return COLORS[Math.abs(hash) % COLORS.length];
  };

  // Fallback contact if none provided, auto-assigning color if missing
  const contact = caller 
    ? { ...caller, color: caller.color || getColorFromName(caller.name || 'Unknown') } 
    : { name: 'Mom', phone: '+91 99887 76655', color: '#FF6B35' };

  const getInitials = (name) =>
    (name || 'Un')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  // Start ringtone when ringing
  useEffect(() => {
    if (phase === 'ringing') {
      const rt = createRingtone();
      rt.start();
      ringtoneRef.current = rt;
      return () => rt.stop();
    }
  }, [phase]);

  // Call timer when active
  useEffect(() => {
    if (phase !== 'active') return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const pickUp = () => {
    ringtoneRef.current?.stop();
    setPhase('active');
    setElapsed(0);
  };

  const hangUp = () => {
    ringtoneRef.current?.stop();
    setPhase('ended');
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const phaseLabel =
    phase === 'ringing' ? 'Incoming Call…' : phase === 'active' ? 'Connected' : 'Call Ended';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col screen-enter overflow-hidden"
      style={{ background: '#0A0A0F' }}
    >
      {/* Realistic blurred gradient background */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, ${contact.color} 0%, #0A0A0F 100%)`,
        }}
      />
      <div className="absolute inset-0 backdrop-blur-[60px] pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex flex-col items-center pt-24 pb-6 px-6 text-center">
          <h2 className="font-syne font-600 text-4xl text-white tracking-wide drop-shadow-md mb-2">
            {contact.name}
          </h2>
          
          <p className="text-white/70 font-dm text-sm tracking-widest uppercase mb-10 drop-shadow">
            {phaseLabel}
          </p>

          {/* Avatar with ping ring while ringing */}
          <div className="relative mb-8">
            {phase === 'ringing' && (
              <>
                <div
                  className="absolute -inset-6 rounded-full animate-ping-slow opacity-20"
                  style={{ background: contact.color }}
                />
                <div
                  className="absolute -inset-3 rounded-full opacity-30"
                  style={{ background: contact.color }}
                />
              </>
            )}
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center font-syne font-800 text-4xl shadow-2xl relative z-10"
              style={{
                background: `${contact.color}33`,
                border: `3px solid ${contact.color}66`,
                color: '#FFFFFF',
                textShadow: `0 2px 10px ${contact.color}`
              }}
            >
              {getInitials(contact.name)}
            </div>
          </div>

          {contact.phone && (
            <p className="text-white/80 font-dm text-lg tracking-wide drop-shadow mb-2">{contact.phone}</p>
          )}

          {/* Status line */}
          <div className="h-6">
            {phase === 'active' && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-dm text-emerald-400 text-base font-medium tabular-nums drop-shadow">
                  {formatTime(elapsed)}
                </span>
              </div>
            )}
            {phase === 'ringing' && (
              <p className="text-white/60 font-dm text-base animate-pulse">Ringing...</p>
            )}
            {phase === 'ended' && (
              <p className="text-white/60 font-dm text-base">Call Ended</p>
            )}
          </div>
        </div>

        {/* ── Active-call controls (mute / speaker / keypad) ── */}
        {phase === 'active' && (
          <div className="flex justify-center gap-8 px-10 mt-2">
            {[
              {
                icon: muted ? '🔇' : '🎙️',
                label: muted ? 'Unmute' : 'Mute',
                action: () => setMuted((m) => !m),
                active: muted,
              },
              { icon: '🔊', label: 'Speaker', action: () => {} },
              { icon: '⌨️', label: 'Keypad', action: () => {} },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.action}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-colors ${
                    btn.active ? 'bg-white/20' : 'bg-white/10'
                  }`}
                >
                  {btn.icon}
                </div>
                <span className="text-xs font-dm text-sahas-soft">{btn.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Call action buttons (accept / reject) ── */}
        <div className="mt-auto pb-24">
          {phase === 'ringing' && (
            <div className="flex justify-center gap-20">
              {/* Reject */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={hangUp}
                  className="w-16 h-16 rounded-full bg-sahas-red flex items-center justify-center text-white text-2xl active:scale-90 transition-transform"
                  style={{ boxShadow: '0 4px 24px rgba(255,45,85,0.5)' }}
                >
                  📵
                </button>
                <span className="text-xs font-dm text-sahas-soft">Decline</span>
              </div>

              {/* Accept */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={pickUp}
                  className="w-16 h-16 rounded-full bg-sahas-green flex items-center justify-center text-white text-2xl active:scale-90 transition-transform"
                  style={{ boxShadow: '0 4px 24px rgba(0,214,143,0.5)' }}
                >
                  📞
                </button>
                <span className="text-xs font-dm text-sahas-soft">Accept</span>
              </div>
            </div>
          )}

          {phase === 'active' && (
            <div className="flex justify-center mt-6">
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={hangUp}
                  className="w-16 h-16 rounded-full bg-sahas-red flex items-center justify-center text-white text-2xl active:scale-90 transition-transform"
                  style={{ boxShadow: '0 4px 24px rgba(255,45,85,0.5)' }}
                >
                  📵
                </button>
                <span className="text-xs font-dm text-sahas-soft">End Call</span>
              </div>
            </div>
          )}

          {phase === 'ended' && (
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-sahas-muted/40 flex items-center justify-center text-2xl opacity-50">
                📵
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
