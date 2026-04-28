import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { supabase } from './supabase.js';
import { Avatar, ThemeToggle } from './components/UI.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import SignupScreen from './screens/SignupScreen.jsx';
import OnboardingScreen from './screens/OnboardingScreen.jsx';
import BottomNav from './components/BottomNav.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import EmergencyScreen from './screens/EmergencyScreen.jsx';
import TrackScreen from './screens/TrackScreen.jsx';
import MapScreen from './screens/MapScreen.jsx';
import TimerScreen from './screens/TimerScreen.jsx';
import FakeCallScreen from './screens/FakeCallScreen.jsx';
import FakeCallSettingsScreen from './screens/FakeCallSettingsScreen.jsx';
import ReportScreen from './screens/ReportScreen.jsx';
import EvidenceVaultScreen from './screens/EvidenceVaultScreen.jsx';
import IncidentDetailScreen from './screens/IncidentDetailScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import AboutMeScreen from './screens/AboutMeScreen.jsx';
import PublicTrackView from './screens/PublicTrackView.jsx';
import './components/GoogleMapProvider.jsx'; // Initialize Google Maps provider

const getGreeting = (name) => {
  const hour = new Date().getHours();
  const firstName = name?.split(' ')[0] || 'User';
  if (hour >= 5 && hour < 12) {
    return `Good morning, ${firstName}! Stay safe 💖`;
  } else if (hour >= 12 && hour < 17) {
    return `Good afternoon, ${firstName}! Stay safe 💖`;
  } else if (hour >= 17 && hour < 21) {
    return `Good evening, ${firstName}! Stay safe 💖`;
  } else {
    return `Stay safe, ${firstName} 💖`;
  }
};

const AppHeader = ({ user }) => (
  <div className="fixed top-0 left-0 right-0 z-30 px-5 pt-6 pb-3 bg-sahas-dark/95 backdrop-blur-md border-b border-sahas-border/50">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="font-brand font-800 text-2xl brand-title italic tracking-tight leading-none">
          Sahasya
        </h1>
        <p className="text-sahas-soft text-xs font-dm mt-1">{getGreeting(user?.name)}</p>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Avatar initials={user?.initials || 'U'} size="md" />
      </div>
    </div>
  </div>
);

export default function App() {
  const { user, login, signup, logout, isLoggedIn, updateEmergencyContacts, updateProfile, completeOnboarding, updatePersonalInfo } = useAuth();

  // Auth screen toggle (login ↔ signup)
  const [authView, setAuthView] = useState('login');

  // ── Main app state ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('home');
  const [showEmergency, setShowEmergency] = useState(false);
  const [shareCode, setShareCode] = useState(null);

  // Check for public share link on mount
  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    // Flexible check: search for 'track/' anywhere in path or hash
    if (path.includes('/track/')) {
      const parts = path.split('/track/');
      const code = parts[parts.length - 1]?.split(/[?#]/)[0]?.replace(/\/$/, '');
      if (code) setShareCode(code);
    } else if (hash.includes('track/')) {
      const parts = hash.split('track/');
      const code = parts[parts.length - 1]?.split(/[?#]/)[0]?.replace(/\/$/, '');
      if (code) setShareCode(code);
    }

    // Auto-recover SOS if it was interrupted
    const activeSOS = localStorage.getItem('sahasya_active_incident_id');
    if (activeSOS) {
       console.log('🔄 SOS RECOVERY: Restoring active emergency screen');
       setShowEmergency(true);
    }
  }, []);

  // Real-time SOS sync across devices
  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;

    let isMounted = true;
    const channelName = `global_sos_sync_${user.id}_${Math.floor(Math.random() * 1000)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'incidents',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (isMounted && payload.new.type === 'SOS Triggered') {
            console.log('🚨 GLOBAL SOS DETECTED via Realtime');
            setShowEmergency(true);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn, user?.id]);
  const [showFakeCallSettings, setShowFakeCallSettings] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [fakeCallContact, setFakeCallContact] = useState(null);
  const [fakeCallDelayTimer, setFakeCallDelayTimer] = useState(null);
  const [showTimer, setShowTimer] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showAboutMeDetail, setShowAboutMeDetail] = useState(false);
  const [reportPrefill, setReportPrefill] = useState(null);

  // ── Public Route Gate (Share Link) ────────────────────────────────────────
  // Only show public view if NOT logged in. If logged in, we stay in the app.
  if (shareCode && !isLoggedIn) {
    return <PublicTrackView shareCode={shareCode} />;
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return authView === 'login' ? (
      <div className="w-full relative min-h-screen bg-sahas-dark overflow-x-hidden">
        <ThemeToggle className="absolute top-6 right-6 z-50" />
        <LoginScreen
          onLogin={async (email, password) => {
            const res = await login(email, password);
            if (res.success) setActiveTab('home');
            return res;
          }}
          onGoSignup={() => setAuthView('signup')}
        />
      </div>
    ) : (
      <div className="w-full relative min-h-screen bg-sahas-dark overflow-x-hidden">
        <ThemeToggle className="absolute top-6 right-6 z-50" />
        <SignupScreen
          onSignup={async (name, email, password, contacts) => {
            const res = await signup(name, email, password, contacts);
            if (res.success) setActiveTab('home');
            return res;
          }}
          onGoLogin={() => setAuthView('login')}
        />
      </div>
    );
  }

  // ── Onboarding gate ───────────────────────────────────────────────────────
  if (!user.onboardingCompleted) {
    return (
      <OnboardingScreen user={user} onComplete={async (info) => {
        const success = await completeOnboarding(info);
        if (success) {
          setActiveTab('home');
        }
      }} />
    );
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleNavigate = (screen) => {
    if (screen === 'fakecall') { setShowFakeCallSettings(true); return; }
    if (screen === 'timer') { setShowTimer(true); return; }
    setActiveTab(screen);
  };

  const handleSOSActivate = () => setShowEmergency(true);
  const handleCancelEmergency = () => setShowEmergency(false);

  const handleTriggerFakeCall = (contact, delaySeconds) => {
    setShowFakeCallSettings(false);
    if (delaySeconds > 0) {
      const tid = setTimeout(() => {
        setFakeCallContact(contact);
        setShowFakeCall(true);
        setFakeCallDelayTimer(null);
      }, delaySeconds * 1000);
      setFakeCallDelayTimer(tid);
    } else {
      setFakeCallContact(contact);
      setShowFakeCall(true);
    }
  };

  const handleCancelFakeCall = () => {
    if (fakeCallDelayTimer) clearTimeout(fakeCallDelayTimer);
    setFakeCallDelayTimer(null);
    setShowFakeCall(false);
    setFakeCallContact(null);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onSOSActivate={handleSOSActivate} onNavigate={handleNavigate} user={user} updateProfile={updateProfile} />;
      case 'map':
        return <MapScreen user={user} />;
      case 'track':
        return <TrackScreen user={user} updateProfile={updateProfile} />;
      case 'report':
        return <ReportScreen
          user={user}
          prefill={reportPrefill}
          onClearPrefill={() => setReportPrefill(null)}
        />;
      case 'vault':
        return <EvidenceVaultScreen
          user={user}
          onNavigateToIncident={(id) => setSelectedIncident(id)}
          onReportIncident={(incident) => {
            setReportPrefill(incident);
            setActiveTab('report');
          }}
        />;
      case 'profile':
        return <ProfileScreen
          user={user}
          onLogout={logout}
          updateEmergencyContacts={updateEmergencyContacts}
          updateProfile={updateProfile}
          onOpenAboutMe={() => setShowAboutMeDetail(true)}
        />;
      default:
        return <HomeScreen onSOSActivate={handleSOSActivate} onNavigate={handleNavigate} user={user} />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-sahas-dark">
      <AppHeader user={user} />

      {/* Main tab content — scrollable between fixed header and bottom nav */}
      <div
        className="pt-[66px] pb-[68px] bg-sahas-dark"
        style={{ minHeight: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        {renderTab()}
        <BottomNav active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Overlay: Emergency */}
      {showEmergency && (
        <EmergencyScreen user={user} onCancel={handleCancelEmergency} />
      )}

      {/* Overlay: Fake Call Settings */}
      {showFakeCallSettings && (
        <div className="fixed inset-0 z-40 bg-sahas-dark overflow-y-auto">
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={() => setShowFakeCallSettings(false)}
              className="w-9 h-9 rounded-full bg-sahas-card border border-sahas-border flex items-center justify-center text-sahas-soft hover:text-sahas-text transition-colors"
            >
              ✕
            </button>
          </div>
          <FakeCallSettingsScreen user={user} onTriggerCall={handleTriggerFakeCall} />
        </div>
      )}

      {/* Overlay: Fake Call */}
      {showFakeCall && (
        <FakeCallScreen caller={fakeCallContact} onClose={handleCancelFakeCall} />
      )}

      {/* Overlay: Incident Detail */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-sahas-dark overflow-y-auto">
          <IncidentDetailScreen
            user={user}
            incidentId={selectedIncident}
            onBack={() => setSelectedIncident(null)}
          />
        </div>
      )}

      {/* Overlay: About Me */}
      {showAboutMeDetail && (
        <div className="fixed inset-0 z-50 bg-sahas-dark overflow-y-auto">
          <AboutMeScreen
            user={user}
            onBack={() => setShowAboutMeDetail(false)}
            updateProfile={updateProfile}
            updatePersonalInfo={updatePersonalInfo}
          />
        </div>
      )}

      {/* Overlay: Check-in Timer */}
      {showTimer && (
        <div className="fixed inset-0 z-40 bg-sahas-dark/95 backdrop-blur-sm overflow-y-auto">
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setShowTimer(false)}
              className="w-9 h-9 rounded-full bg-sahas-card border border-sahas-border flex items-center justify-center text-sahas-soft hover:text-sahas-text"
            >
              ✕
            </button>
          </div>
          <TimerScreen
            user={user}
            onSOSActivate={() => {
              setShowTimer(false);
              setShowEmergency(true);
            }}
          />
        </div>
      )}
    </div>
  );
}
