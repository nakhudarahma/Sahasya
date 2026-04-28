import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ProgressRing, Card, Toast } from '../components/UI.jsx';
import { supabase } from '../supabase.js';

const PRESET_TIMES = [5, 10, 15, 20, 30];

// Play an alert beep using Web Audio API (no external files needed)
function playAlertBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Three urgent beeps
    playTone(880, ctx.currentTime, 0.25);
    playTone(880, ctx.currentTime + 0.35, 0.25);
    playTone(1100, ctx.currentTime + 0.70, 0.4);
  } catch (_) {
    // Audio not supported — silent fail
  }
}

// Show a browser notification (requests permission if needed)
async function showExpiredNotification() {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'denied') return;
    if (Notification.permission !== 'granted') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') return;
    }
    new Notification('Sahasya — Timer Finish', {
      body: 'Your check-in timer has reached 00:00.',
      icon: '/favicon.ico',
      requireInteraction: true,
    });
  } catch (_) {
    // Notifications not supported — silent fail
  }
}

export default function TimerScreen({ onSOSActivate, user }) {
  const [selectedMinutes, setSelectedMinutes] = useState(15);
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | running | warning | expired
  const [toast, setToast] = useState(null);
  
  // Storage keys
  const TIMER_END_KEY = 'sahasya_timer_end';
  const TIMER_TOTAL_KEY = 'sahasya_timer_total';

  // Single stable interval ref — started/stopped only in button handlers
  const intervalRef = useRef(null);
  const secondsLeftRef = useRef(0); // mirror of secondsLeft for use inside the interval closure
  const isInternalUpdateRef = useRef(false);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Keep the ref in sync with state (read by interval closure)
  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  // Sync Timer with Database
  const syncTimerToDB = async (expiresAt, active = true) => {
    if (!user) return;
    try {
      isInternalUpdateRef.current = true;
      if (active) {
        await supabase
          .from('timers')
          .upsert({ user_id: user.id, expires_at: new Date(expiresAt).toISOString(), is_active: true }, { onConflict: 'user_id' });
      } else {
        await supabase
          .from('timers')
          .update({ is_active: false })
          .eq('user_id', user.id);
      }
    } catch (err) {
      console.error('Failed to sync timer to DB:', err);
    }
  };

  // Cleanup and Persistence Check on mount
  useEffect(() => {
    if (!user) return;

    const fetchActiveTimer = async () => {
      const { data } = await supabase
        .from('timers')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (data) {
        const endTime = new Date(data.expires_at).getTime();
        const now = Date.now();
        if (endTime > now) {
          const remaining = Math.round((endTime - now) / 1000);
          const total = Math.round((endTime - new Date(data.created_at).getTime()) / 1000);
          startCountdown(remaining, endTime, total, true);
        } else {
          setPhase('expired');
        }
      }
    };

    fetchActiveTimer();

    let isMounted = true;
    const channelName = `timer_sync_${user.id}_${Math.floor(Math.random() * 1000)}`;

    // Subscribe to Realtime
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timers',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (!isMounted) return;
          if (isInternalUpdateRef.current) {
             isInternalUpdateRef.current = false;
             return;
          }
          console.log('🔔 Remote timer event received:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (payload.new.is_active) {
              const endTime = new Date(payload.new.expires_at).getTime();
              const now = Date.now();
              if (endTime > now) {
                const remaining = Math.round((endTime - now) / 1000);
                const total = Math.round((endTime - new Date(payload.new.created_at).getTime()) / 1000);
                startCountdown(remaining, endTime, total, true);
              }
            } else {
              // Remote device stopped the timer
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = null;
              setIsRunning(false);
              setPhase('idle');
              setSecondsLeft(0);
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const startCountdown = useCallback((durationSeconds, forcedEndTime = null, forcedTotal = null, skipSync = false) => {
    // Clear any existing interval first
    if (intervalRef.current) clearInterval(intervalRef.current);

    const total = forcedTotal || durationSeconds;
    const endTime = forcedEndTime || (Date.now() + durationSeconds * 1000);

    setTotalSeconds(total);
    setSecondsLeft(durationSeconds);
    secondsLeftRef.current = durationSeconds;
    setIsRunning(true);
    setPhase(durationSeconds <= 60 ? 'warning' : 'running');

    // Persist
    if (!skipSync) {
      syncTimerToDB(endTime, true);
      localStorage.setItem(TIMER_END_KEY, endTime.toString());
      localStorage.setItem(TIMER_TOTAL_KEY, total.toString());
    }

    intervalRef.current = setInterval(() => {
      const currentNow = Date.now();
      const remaining = Math.max(0, Math.round((endTime - currentNow) / 1000));
      
      secondsLeftRef.current = remaining;
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        // Timer expired
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setSecondsLeft(0);
        setIsRunning(false);
        setPhase('expired');
        playAlertBeep();
        showExpiredNotification();
        localStorage.removeItem(TIMER_END_KEY);
        localStorage.removeItem(TIMER_TOTAL_KEY);
        return;
      }

      // Enter warning phase at 60 seconds remaining
      if (remaining <= 60) {
        setPhase('warning');
      }
    }, 1000);
  }, []);

  const handleStart = () => {
    const mins = selectedMinutes;
    if (!mins || mins < 1) return;
    startCountdown(mins * 60);
    showToast(`Check-in timer started for ${mins} min`, 'success');
  };

  const handleCheckIn = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsRunning(false);
    setPhase('idle');
    setSecondsLeft(0);
    setTotalSeconds(0);
    syncTimerToDB(null, false);
    localStorage.removeItem(TIMER_END_KEY);
    localStorage.removeItem(TIMER_TOTAL_KEY);
    showToast('✅ Safety confirmed! Timer reset.', 'success');
  };

  const handleStop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsRunning(false);
    setPhase('idle');
    setSecondsLeft(0);
    setTotalSeconds(0);
    syncTimerToDB(null, false);
    localStorage.removeItem(TIMER_END_KEY);
    localStorage.removeItem(TIMER_TOTAL_KEY);
  };

  const handleTriggerSOS = () => {
    handleStop();
    onSOSActivate();
  };

  const handleSelectPreset = (min) => {
    setSelectedMinutes(min);
    setShowCustom(false);
    setCustomInput('');
  };

  const handleCustomConfirm = () => {
    const val = parseInt(customInput, 10);
    if (!val || val < 1 || val > 1440) {
      showToast('Enter a valid number (1–1440 min)', 'danger');
      return;
    }
    setSelectedMinutes(val);
    setShowCustom(false);
    setCustomInput('');
  };

  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const ringColor =
    phase === 'expired'
      ? '#FF2D55'
      : phase === 'warning'
      ? '#FFB800'
      : phase === 'running'
      ? '#00D68F'
      : '#00D68F';

  return (
    <div className="min-h-screen bg-sahas-dark noise screen-enter pb-28">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="px-5 pt-4 pb-6">
        <p className="text-sahas-soft text-xs font-dm tracking-widest uppercase">Safety</p>
        <h1 className="font-syne font-800 text-2xl text-sahas-text mt-0.5">
          Check-in Timer <span className="text-sahas-red">.</span>
        </h1>
        <p className="text-sahas-soft text-xs font-dm mt-1.5">
          Auto-triggers SOS if you don't check in on time
        </p>
      </div>

      {/* Expired Alert */}
      {phase === 'expired' && (
        <div className="mx-5 mb-5 p-4 rounded-2xl bg-sahas-red/15 border border-sahas-red/60 animate-scale-in shadow-xl shadow-sahas-red/10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="font-syne font-700 text-sahas-red">Check-in Missed!</p>
              <p className="text-xs font-dm text-sahas-soft">Tap below to confirm you are safe</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCheckIn}
              className="flex-1 py-2.5 rounded-xl bg-sahas-green/20 border border-sahas-green/40 text-sahas-green text-sm font-dm font-medium"
            >
              ✅ I'm Safe
            </button>
            <button
              onClick={handleTriggerSOS}
              className="flex-1 py-2.5 rounded-xl bg-sahas-red text-white text-sm font-dm font-medium"
            >
              🆘 SOS Now
            </button>
          </div>
        </div>
      )}

      {/* Timer Ring */}
      <div className="flex flex-col items-center py-8">
        <ProgressRing
          progress={phase === 'idle' ? 100 : (isRunning || phase === 'expired' ? progress : 0)}
          size={220}
          stroke={12}
          color={ringColor}
        >
          <div className="flex flex-col items-center">
            {isRunning ? (
              <>
                <span
                  className={`font-syne font-800 text-4xl tabular-nums ${
                    phase === 'warning' ? 'text-sahas-amber' : 'text-sahas-text'
                  }`}
                >
                  {formatTime(secondsLeft)}
                </span>
                <span className="text-xs font-dm text-sahas-soft mt-1">remaining</span>
                {phase === 'warning' && (
                  <span className="text-xs font-dm text-sahas-amber mt-1 animate-pulse">
                    ⚠️ Check in soon!
                  </span>
                )}
              </>
            ) : phase === 'expired' ? (
              <>
                <span className="font-syne font-800 text-4xl text-sahas-red">00:00</span>
                <span className="text-xs font-dm text-sahas-red mt-1 rec-dot">EXPIRED</span>
              </>
            ) : (
              <>
                <span className="font-syne font-800 text-3xl text-sahas-text">{selectedMinutes}m</span>
                <span className="text-xs font-dm text-sahas-soft mt-1">selected</span>
              </>
            )}
          </div>
        </ProgressRing>
      </div>

      {/* Preset Times + Custom */}
      {!isRunning && phase !== 'expired' && (
        <div className="px-5 mb-6">
          <p className="text-xs font-dm text-sahas-soft mb-3 uppercase tracking-wider text-center">
            Set Duration
          </p>

          {/* Preset buttons */}
          <div className="flex gap-2 justify-center flex-wrap mb-3">
            {PRESET_TIMES.map((min) => (
              <button
                key={min}
                onClick={() => handleSelectPreset(min)}
                className={`px-4 py-2.5 rounded-xl text-sm font-dm font-medium transition-all ${
                  selectedMinutes === min && !showCustom
                    ? 'bg-sahas-green text-sahas-dark font-bold'
                    : 'bg-sahas-card border border-sahas-border text-sahas-soft hover:border-sahas-muted'
                }`}
              >
                {min}m
              </button>
            ))}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className={`px-4 py-2.5 rounded-xl text-sm font-dm font-medium transition-all ${
                showCustom
                  ? 'bg-sahas-teal text-sahas-dark font-bold'
                  : 'bg-sahas-card border border-sahas-border text-sahas-soft hover:border-sahas-muted'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom minute input */}
          {showCustom && (
            <div className="flex gap-2 mt-1">
              <input
                type="number"
                min="1"
                max="1440"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomConfirm()}
                placeholder="Minutes (1–1440)"
                className="flex-1 bg-sahas-dark border border-sahas-border rounded-xl px-4 py-2.5 text-sm font-dm text-sahas-text outline-none focus:border-sahas-teal/60 transition-colors"
              />
              <button
                onClick={handleCustomConfirm}
                className="px-5 py-2.5 rounded-xl bg-sahas-teal text-sahas-dark text-sm font-dm font-bold transition-all active:scale-95"
              >
                Set
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-5 mb-5">
        {!isRunning && phase !== 'expired' && (
          <button
            onClick={handleStart}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-sahas-green to-sahas-teal text-sahas-dark font-syne font-700 text-sm active:scale-98 transition-all shadow-lg"
            style={{ boxShadow: '0 8px 24px rgba(0,214,143,0.25)' }}
          >
            ▶ Start Check-in Timer
          </button>
        )}

        {isRunning && (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCheckIn}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-sahas-green to-sahas-teal text-sahas-dark font-syne font-700 text-sm active:scale-98 transition-all"
            >
              ✅ I'm Safe – Check In
            </button>
            <button
              onClick={handleStop}
              className="w-full py-3 rounded-2xl border border-sahas-muted bg-sahas-card text-sahas-soft text-sm font-dm active:scale-98 transition-all"
            >
              ■ Stop Timer
            </button>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="px-5">
        <Card className="p-4">
          <p className="text-xs font-dm text-sahas-soft mb-3 uppercase tracking-wider">How it works</p>
          <div className="space-y-3">
            {[
              { text: 'Set a timer before your journey begins', icon: '⏱️' },
              { text: 'Tap "I\'m Safe" to reset when you arrive safely', icon: '✅' },
              { text: 'Get an alert beep when the timer finishes', icon: '🔔' },
              { text: 'Tap "SOS Now" to send emergency alert immediately', icon: '🚨' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sahas-red/10 border border-sahas-red/20 flex items-center justify-center text-sm flex-shrink-0">
                  {item.icon}
                </div>
                <p className="text-xs font-dm text-sahas-soft flex-1">{item.text}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
