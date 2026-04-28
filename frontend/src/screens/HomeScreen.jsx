import React, { useState, useEffect } from 'react';
import { Card, Avatar, Toast } from '../components/UI.jsx';
import { useIncidents } from '../hooks/useIncidents.js';
import { api } from '../api.js';

const safetyTips = [
  'Share your live location before night travel',
  'Set check-in timers on solo trips',
  'Know your nearest police station',
  'Keep trusted contacts updated',
];


export default function HomeScreen({ onSOSActivate, onNavigate, user, updateProfile }) {
  const [safetyLevel, setSafetyLevel] = useState('safe'); // safe | caution | danger
  const [tipIndex, setTipIndex] = useState(0);
  const [toast, setToast] = useState(null);
  const [aiAlerts, setAiAlerts] = useState([]);
  const [isSimulated, setIsSimulated] = useState(false);
  const [aiInsights, setAiInsights] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState('prompt'); // 'granted' | 'denied' | 'prompt'
  const [streak, setStreak] = useState(() => {
    const localCount = parseInt(localStorage.getItem('sahasya_streak_count') || '0');
    const localLast = localStorage.getItem('sahasya_last_streak');
    const cloudStreak = user?.personalInfo?.streak;

    // Favor cloud data if it's more recent or higher
    if (cloudStreak && cloudStreak.count >= localCount) {
      return cloudStreak;
    }
    return { count: localCount, last: localLast };
  });

  // Sync streak from profile updates (Realtime)
  useEffect(() => {
    if (user?.personalInfo?.streak) {
      const s = user.personalInfo.streak;
      setStreak(s);
      localStorage.setItem('sahasya_streak_count', s.count.toString());
      localStorage.setItem('sahasya_last_streak', s.last);
    }
  }, [user?.personalInfo?.streak]);

  // Listen for streak updates across app
  useEffect(() => {
    const handleStorage = () => {
      setStreak({
        count: parseInt(localStorage.getItem('sahasya_streak_count') || '0'),
        last: localStorage.getItem('sahasya_last_streak')
      });
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Rotate safety tips
  useEffect(() => {
    const t = setInterval(() => setTipIndex(i => (i + 1) % safetyTips.length), 5000);
    return () => clearInterval(t);
  }, []);

  const [nearestPolice, setNearestPolice] = useState({ name: 'Locating...', address: 'Finding nearest station' });

  // Fetch AI Recommendations based on location
  const fetchAiInsights = async (lat, lng) => {
    if (isSimulated) return;
    setIsAiLoading(true);
    try {
      // 1. Fetch AI Safety Alerts
      const result = await api.post('/ai/recommendations', { lat, lng });
      setAiInsights(result || '');
      const recommendations = result.split('\n').filter(line => line.trim().length > 0);
      setAiAlerts(recommendations);
      
      const text = (result || '').toLowerCase();
      let level = 'safe';
      if (text.includes('danger') || text.includes('risk') || text.includes('avoid')) {
        level = 'danger';
      } else if (text.includes('caution') || text.includes('alert')) {
        level = 'caution';
      }
      
      // 1. Alert user if level increased (Danger/Caution)
      if (level !== 'safe' && level !== safetyLevel) {
        // Respect user's Risk Alert preference
        if (user?.riskAlerts !== false) {
          // Haptic Feedback
          if (window.navigator.vibrate) window.navigator.vibrate([200, 100, 200]);
          
          // Voice Guidance
          const msg = level === 'danger' ? 'Danger detected. Move to safety immediately.' : 'Caution. Stay alert in this area.';
          const speech = new SpeechSynthesisUtterance(msg);
          speech.rate = 0.9;
          window.speechSynthesis.speak(speech);
        } else {
          console.log('🔇 Risk Alerts (Vibration/Voice) are disabled by user.');
        }
      }

      setSafetyLevel(level);

      // 2. Fetch Nearest Safe Point (Police or Hospital)
      const { findNearestEmergencyPoint } = await import('../components/GoogleMapProvider.jsx');
      const safePoint = await findNearestEmergencyPoint(lat, lng);
      setNearestPolice(safePoint);
      
    } catch (err) {
      console.error('AI Insights Error:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // ── Real-time permission monitoring ──────────────────────────────────────
  useEffect(() => {
    if (!navigator.permissions) return;
    let permStatus = null;

    navigator.permissions.query({ name: 'geolocation' }).then(status => {
      permStatus = status;
      setLocationPermission(status.state);

      status.onchange = () => {
        setLocationPermission(status.state);
        if (status.state === 'denied' || status.state === 'prompt') {
          // Immediately clear stale data so no fake location is shown
          setAiAlerts([]);
          setSafetyLevel('safe');
          setNearestPolice({ name: 'Police Station', address: 'Enable in App Settings' });
        }
      };
    }).catch(() => {});

    return () => {
      if (permStatus) permStatus.onchange = null;
    };
  }, []);

  useEffect(() => {
    if (user?.locationSharing === false || !navigator.geolocation) {
      setAiAlerts([]);
      setSafetyLevel('safe');
      setNearestPolice({ name: 'Police Station', address: 'Location sharing off' });
      return;
    }

    // Use watchPosition for real-time accuracy
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocationPermission('granted');
        fetchAiInsights(latitude, longitude);
      },
      (err) => {
        console.warn('Location access denied or signal lost:', err.message);
        if (err.code === 1) { // PERMISSION_DENIED
          setLocationPermission('denied');
          setAiAlerts([]);
          setSafetyLevel('safe');
        }
        setNearestPolice({ name: 'Police Station', address: 'Enable in App Settings' });
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 // Never use cached position
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user?.locationSharing]);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSOSPress = () => onSOSActivate();

  const { incidents } = useIncidents(user);
  
  // Calculate granular, reactive safety score
  const getSafetyScore = () => {
    let score = 100;
    
    // 1. History Penalty (based on past incidents)
    score -= Math.min(30, incidents.length * 8);
    
    // 2. Real-time AI Penalty
    const aiPenalty = safetyLevel === 'danger' ? 45 : safetyLevel === 'caution' ? 20 : 0;
    score -= aiPenalty;
    
    // 3. Alert Count Penalty (minor refinement)
    score -= Math.min(15, aiAlerts.length * 5);
    
    // Final Clamp
    return Math.max(5, Math.min(100, score));
  };

  const safetyScore = getSafetyScore();
  const scoreColor = safetyScore > 80 ? 'text-sahas-green' : safetyScore > 50 ? 'text-sahas-amber' : 'text-sahas-red';
  
  const recentIncidents = incidents.slice(0, 4);

  const handleFakeCall = () => onNavigate('fakecall');
  const handleTrack = () => onNavigate('track');
  const handleTimer = () => onNavigate('timer');

  const safetyColors = {
    safe: { dot: 'bg-sahas-green', text: 'text-sahas-green', label: 'Area Safe', border: 'border-sahas-green/30' },
    caution: { dot: 'bg-sahas-amber', text: 'text-sahas-amber', label: 'Use Caution', border: 'border-sahas-amber/30' },
    danger: { dot: 'bg-sahas-red', text: 'text-sahas-red', label: 'High Risk Zone', border: 'border-sahas-red/30' },
  };
  const sc = safetyColors[safetyLevel];

  return (
    <div className="min-h-screen bg-sahas-dark noise screen-enter pb-28 pt-4">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Location Permission Banner — shown instantly when permission is denied */}
      {locationPermission !== 'granted' && (
        <div className="mx-5 mb-4 p-3 rounded-2xl bg-sahas-amber/10 border border-sahas-amber/40 flex items-center gap-3">
          <span className="text-xl flex-shrink-0">📍</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-syne font-bold text-sahas-amber">Location Access Required</p>
            <p className="text-[10px] font-dm text-sahas-amber/70 mt-0.5">
              {locationPermission === 'denied'
                ? 'Location was turned off. Enable in browser or app settings.'
                : 'Enable location for real-time safety alerts.'}
            </p>
          </div>
        </div>
      )}
      {/* Safety Score Dashboard */}
      <div className="px-5 mb-4">
         <div className="grid grid-cols-2 gap-3">
            {/* Safety Score */}
            <Card className={`p-3 flex items-center gap-3 border-sahas-border/50 bg-sahas-card/10 ${sc.border}`}>
               <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-sahas-card border border-sahas-border shadow-sm`}>
                 <span className={`font-syne font-800 text-xl leading-none ${scoreColor}`}>{safetyScore}</span>
               </div>
               <div>
                 <p className="text-[10px] font-dm text-sahas-text uppercase tracking-widest font-medium">{sc.label}</p>
                 <p className="text-[8px] font-dm text-sahas-soft">AI Risk Score</p>
               </div>
            </Card>

            {/* Safety Streak (ACTIVE ENGAGEMENT) */}
            <Card 
              onClick={() => {
                const now = new Date();
                const today = now.toDateString();
                const currentCount = streak?.count || (typeof streak === 'number' ? streak : 0);
                const lastCheckin = streak?.last || localStorage.getItem('sahasya_last_streak');
                
                if (lastCheckin === today) {
                  showToast("You already checked in today! 🔥", "info");
                  return;
                }

                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                
                let newCount = 1;
                if (lastCheckin === yesterday.toDateString()) {
                  newCount = currentCount + 1;
                }
                
                const newStreak = { count: newCount, last: today };

                // 1. Sync Local (Instant UI feedback)
                localStorage.setItem('sahasya_streak_count', newCount.toString());
                localStorage.setItem('sahasya_last_streak', today);
                setStreak(newStreak);
                window.dispatchEvent(new Event('storage'));
                
                // 2. Sync Cloud (Background persistence)
                if (updateProfile && user) {
                  updateProfile({
                    personalInfo: {
                      streak: newStreak
                    }
                  });
                }

                showToast(`Check-in successful! ${newCount} day streak 🔥`, "success");
              }}
              className={`p-3 flex items-center gap-3 border-sahas-border/50 bg-sahas-card/10 active:scale-95 transition-all cursor-pointer ${
                streak.last === new Date().toDateString() ? 'border-sahas-teal/50 bg-sahas-teal/5' : ''
              }`}
            >
               <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-sahas-card border border-sahas-border shadow-sm`}>
                 <span className={`text-xl ${streak.last === new Date().toDateString() ? '' : 'grayscale opacity-50'}`}>🔥</span>
               </div>
               <div>
                 <p className="text-[10px] font-dm text-sahas-text uppercase tracking-widest font-bold">
                   {streak.count} Day Streak
                 </p>
                 <p className="text-[8px] font-dm text-sahas-soft">
                   {streak.last === new Date().toDateString() ? 'Confirmed Well' : 'Tap to check-in'}
                 </p>
               </div>
            </Card>
         </div>
      </div>

      {/* SOS Button - Core Primary Actions */}
      <div className="flex flex-col items-center pt-4 pb-12 px-5">
        
        {/* Outer glow rings */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-[240px] h-[240px] rounded-full border border-sahas-red/10 animate-ping-slow" />
          <div className="absolute w-[200px] h-[200px] rounded-full border border-sahas-red/15" />
          
          {/* Main SOS Button */}
          <button
            onPointerDown={handleSOSPress}
            className="relative w-40 h-40 rounded-full bg-[#FF6F91] flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-transform sos-ripple"
            style={{ boxShadow: '0 0 50px rgba(255,111,145,0.4), 0 0 100px rgba(255,111,145,0.15)' }}
          >
            <span className="text-5xl mb-1">🆘</span>
            <span className="font-syne font-800 text-white text-sm tracking-widest uppercase">Hold SOS</span>
          </button>
        </div>

        <p className="text-sahas-soft text-xs font-dm mt-8 text-center max-w-[260px] opacity-70">
          Press & hold strictly in emergencies. Audio, video, and live location will be shared immediately.
        </p>
      </div>

      {/* Secondary Information: Alerts & Status (Surgically Restored) */}
      <div className="px-5 mb-6">
        <p className="text-sahas-soft text-xs font-dm mb-3 tracking-widest uppercase">Insights & Reports</p>
        {/* Safe Environment (Restored Original Style with Updated Content) */}
        <Card className={`p-4 mb-3 ${
          safetyLevel === 'danger' ? 'border-sahas-red/40 bg-sahas-red/5' : 
          safetyLevel === 'caution' ? 'border-sahas-amber/40 bg-sahas-amber/5' : 
          'border-sahas-border bg-sahas-card/40'
        }`}>
          <div className="flex justify-between items-center mb-3">
            <p className={`text-[10px] font-dm uppercase tracking-wider flex items-center gap-2 ${
              safetyLevel === 'danger' ? 'text-sahas-red' : 
              safetyLevel === 'caution' ? 'text-sahas-amber' : 
              'text-sahas-soft'
            }`}>
              <span>🛡️</span> Safety Insights
            </p>
          </div>
          
          <div className="space-y-2">
            {[
              'Stay alert and observe surroundings',
              'Alert trusted contacts using SOS',
              'Call emergency number 112 or 181',
              'Move to a crowded or well-lit area'
            ].map((text, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/40 border border-sahas-border/40"
              >
                <span className={`text-[10px] opacity-60 ${
                  safetyLevel === 'danger' ? 'text-sahas-red' : 
                  safetyLevel === 'caution' ? 'text-sahas-amber' : 
                  'text-sahas-soft'
                }`}>✦</span>
                <p className="text-xs font-dm text-sahas-text">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="px-5 mb-6">
        <Card className="p-3">
          <div className="flex justify-between items-center mb-2.5">
             <p className="text-[9px] font-dm text-sahas-soft uppercase tracking-widest flex items-center gap-2 opacity-80">
               <span>🕒</span> Recent Activity
             </p>
             <button onClick={() => onNavigate('vault')} className="text-[9px] font-dm text-sahas-teal p-1.5 -m-1.5 active:scale-95 transition-transform uppercase tracking-wider">View All</button>
          </div>
          <div className="space-y-1.5">
            {recentIncidents.length === 0 ? (
              <p className="text-[10px] font-dm text-sahas-muted py-1">No recent activity.</p>
            ) : (
              recentIncidents.slice(0, 4).map(inc => (
                <div key={inc.id} className="flex justify-between items-center bg-sahas-dark/40 rounded-lg p-2 border border-sahas-border/40">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-sahas-red shadow-[0_0_5px_rgba(255,45,85,0.5)]" />
                    <span className="text-[10px] font-dm text-sahas-text/90">{inc.type}</span>
                  </div>
                  <span className="text-[8px] font-dm text-sahas-soft opacity-60 uppercase tracking-tighter">
                    {new Date(inc.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-5 mb-5">
        <p className="text-sahas-soft text-xs font-dm mb-3 tracking-widest uppercase">Quick Actions</p>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[
            { icon: '📍', label: 'Track Me', action: handleTrack, highlight: false },
            { icon: '⏱️', label: 'Check-in', action: handleTimer, highlight: false },
            { icon: '📞', label: 'Fake Call', action: handleFakeCall, highlight: false },
            { icon: '🗺️', label: 'Safe Map', action: () => onNavigate('map'), highlight: false },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-sahas-card border border-sahas-border hover:border-sahas-muted active:scale-95 transition-all"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[10px] font-dm text-sahas-soft leading-tight text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sahas-soft text-xs font-dm tracking-widest uppercase">Emergency Contacts</p>
          <button 
            onClick={() => onNavigate('profile')}
            className="text-xs text-sahas-teal font-dm p-2 -m-2 active:scale-95 transition-transform"
          >
            Manage →
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {(user?.emergencyContacts || []).map((c, idx) => {
            const COLORS = ['#FF6B35', '#00D68F', '#00C4CC', '#FFB800', '#7C3AED', '#00D68F'];
            const color = COLORS[idx % COLORS.length];
            const initials = c.name?.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
            return (
              <button
                key={c.id}
                className="flex flex-col items-center gap-2 flex-shrink-0"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-syne font-700 text-sm relative"
                  style={{ background: `${color}20`, border: `2px solid ${color}44`, color: color }}
                >
                  {initials}
                  {c.telegram_chat_id && (
                    <span 
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0088CC] border-2 border-sahas-dark flex items-center justify-center text-[8px] text-white shadow-sm"
                      title="Telegram Linked"
                    >
                      ✓
                    </span>
                  )}
                </div>
                <span className="text-xs font-dm text-sahas-soft">{c.name}</span>
              </button>
            );
          })}
          <button
            onClick={() => onNavigate('profile')}
            className="flex flex-col items-center gap-2 flex-shrink-0"
          >
            <div className="w-12 h-12 rounded-full bg-sahas-card border-2 border-dashed border-sahas-muted flex items-center justify-center">
              <span className="text-sahas-soft text-xl">+</span>
            </div>
            <span className="text-xs font-dm text-sahas-soft">Add</span>
          </button>
        </div>
      </div>

      {/* Safety Tip */}
      <div className="px-5 mb-5">
        <div className="p-4 rounded-2xl bg-gradient-to-r from-sahas-teal/10 to-sahas-green/10 border border-sahas-teal/20">
          <div className="flex gap-3">
            <span className="text-lg flex-shrink-0">💡</span>
            <div>
              <p className="text-xs font-dm text-sahas-teal mb-1 uppercase tracking-wider">Safety Tip</p>
              <p className="text-sm font-dm text-sahas-text transition-all">{safetyTips[tipIndex]}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
