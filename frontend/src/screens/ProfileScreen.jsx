import React, { useState } from 'react';
import { reverseGeocode as universalReverseGeocode, fetchAccurateLocation } from '../components/GoogleMapProvider.jsx';
import { Card, Toggle, Divider, Toast } from '../components/UI.jsx';
import { useAuth } from '../hooks/useAuth.js';

// Avatar colour palette (cycles by index)
const COLORS = ['#FF6B35', '#00D68F', '#00C4CC', '#FFB800', '#7C3AED', '#00D68F'];

// Derive display-friendly fields from a raw stored contact
const enrichContact = (c, idx) => {
  const digits = (c.phone || '').toString().replace(/[^\d]/g, '');
  const normalized = digits.slice(-10);
  
  return {
    ...c,
    normalized,
    isLinked: !!c.telegram_chat_id,
    initials: c.name
      ?.trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?',
    color:    COLORS[idx % COLORS.length],
    relation: c.relation || 'Emergency Contact',
  };
};

export default function ProfileScreen({ user, onLogout, updateEmergencyContacts, updateProfile, onOpenAboutMe }) {
  const { verifyPassword } = useAuth();
  
  // Profile Lock State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const handleActionWithAuth = (action) => {
    if (isUnlocked) {
      action();
    } else {
      setPendingAction(() => action);
      setShowAuthOverlay(true);
    }
  };

  const handleUnlock = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setIsVerifying(true);
    
    const isValid = await verifyPassword(password);
    if (isValid) {
      setIsUnlocked(true);
      setShowAuthOverlay(false);
      setPassword('');
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } else {
      setError('Incorrect account password.');
    }
    setIsVerifying(false);
  };

  // Seed from real auth data
  const [contacts, setContacts] = useState(() =>
    (user?.emergencyContacts ?? []).map(enrichContact)
  );

  // Derive display values
  const displayName    = user?.name     ?? 'User';
  const displayEmail   = user?.email    ?? '';
  const displayInitials = user?.initials ?? (displayName || '').slice(0, 2).toUpperCase();

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name ?? 'User');
  const [toast, setToast] = useState(null);
  const [confirmOverlay, setConfirmOverlay] = useState(null);

  React.useEffect(() => {
    if (user?.emergencyContacts) {
      setContacts(user.emergencyContacts.map(enrichContact));
    }
  }, [user?.emergencyContacts]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAdd = () => {
    setForm({ name: '', phone: '' });
    setEditing('new');
  };

  const openEdit = (contact) => {
    setForm({ name: contact.name, phone: contact.phone || '' });
    setEditing(contact.id);
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ name: '', phone: '' });
  };

  const handleSaveContact = () => {
    const name = form.name.trim();
    const phone = form.phone.trim();
    if (!name || !phone) {
      showToast('Both name and phone are required', 'error');
      return;
    }

    const isNew = editing === 'new';
    setConfirmOverlay({
      title: isNew ? 'Add Contact?' : 'Update Contact?',
      message: `Are you sure you want to ${isNew ? 'add' : 'update'} this contact?`,
      onConfirm: () => {
        let updatedList;
        if (isNew) {
          const newC = { id: Date.now().toString(), name, phone: form.phone.trim() };
          updatedList = [...contacts, newC];
          showToast('Contact added', 'success');
        } else {
          updatedList = contacts.map(c => 
            c.id === editing ? { ...c, name, phone: form.phone.trim() } : c
          );
          showToast('Contact updated', 'success');
        }

        updateEmergencyContacts(updatedList);
        setContacts(updatedList.map(enrichContact));
        cancelEdit();
        setConfirmOverlay(null);
      }
    });
  };

  const removeContact = (id) => {
    setConfirmOverlay({
      title: 'Remove Contact?',
      message: 'Are you sure you want to remove this contact?',
      onConfirm: () => {
        const updatedList = contacts.filter((x) => x.id !== id);
        updateEmergencyContacts(updatedList);
        setContacts(updatedList.map(enrichContact));
        showToast('Contact removed', 'info');
        setConfirmOverlay(null);
      }
    });
  };

  const [showLegalGuide, setShowLegalGuide] = useState(false);

  const legalItems = [
    { 
      title: "Zero FIR", 
      desc: "You can file a FIR at ANY police station, regardless of where the crime occurred. It must later be transferred to the correct station.",
      law: "Section 154 CrPC",
      icon: "⚖️"
    },
    { 
      title: "Right to Online FIR", 
      desc: "For non-emergency/minor crimes, you can file an e-FIR on the official portal of your state police without visiting a station.",
      law: "Digital Rights",
      icon: "💻"
    },
    { 
      title: "Night Arrest Protection", 
      desc: "A woman cannot be arrested after sunset (6 PM) and before sunrise (6 AM), except in extraordinary cases with a lady magistrate's order.",
      law: "Section 46(4) CrPC",
      icon: "🌙"
    },
    { 
      title: "Free Legal Aid", 
      desc: "If you are a victim of sexual assault or cannot afford a lawyer, the State is legally mandated to provide you with free legal counsel.",
      law: "NALSA Rights",
      icon: "🤝"
    },
    { 
      title: "Privacy of Statement", 
      desc: "A woman victim of sexual assault can record her statement only in the presence of a woman police officer or a woman magistrate.",
      law: "Section 164 CrPC",
      icon: "🔒"
    }
  ];

  const LegalGuide = () => (
    <div className="fixed inset-0 z-[100] bg-sahas-dark overflow-y-auto screen-enter">
      <div className="px-5 pt-8 pb-10">
        <button onClick={() => setShowLegalGuide(false)} className="mb-6 text-sahas-soft flex items-center gap-2">
          <span>←</span> <span className="text-xs font-dm uppercase tracking-widest">Back to Profile</span>
        </button>
        
        <p className="text-sahas-soft text-[10px] font-dm tracking-[0.2em] uppercase mb-1">Empowerment</p>
        <h2 className="font-syne font-800 text-3xl text-sahas-text mb-6">Digital Legal Guide <span className="text-sahas-teal">.</span></h2>

        <div className="space-y-4">
          {legalItems.map((item, idx) => (
            <Card key={idx} className="p-5 border-sahas-teal/20 bg-sahas-card shadow-lg">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sahas-teal/15 flex items-center justify-center text-2xl flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-syne font-700 text-sahas-text mb-1">{item.title}</h3>
                  <p className="text-xs font-dm text-sahas-soft leading-relaxed mb-3">{item.desc}</p>
                  <span className="text-[9px] font-dm bg-sahas-teal/20 text-sahas-teal px-2 py-0.5 rounded-full uppercase tracking-widest">{item.law}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        <p className="mt-8 text-center text-[10px] font-dm text-sahas-muted italic">
          * This guide provides general information and does not constitute legal advice.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-sahas-dark noise screen-enter pb-28">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {showLegalGuide && <LegalGuide />}
      
      {/* Auth Overlay (NO EMOJI) */}
      {showAuthOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-sahas-dark/80 backdrop-blur-md px-6 animate-fade-in">
          <div className="w-full max-w-sm p-8 rounded-3xl bg-sahas-card border border-sahas-border shadow-2xl animate-scale-in">
            <div className="text-center mb-8">
              <h3 className="font-syne font-bold text-xl text-sahas-text">Verify Identity</h3>
              <p className="font-dm text-sm text-sahas-soft mt-1">Confirm account password to proceed</p>
            </div>
            
            <form onSubmit={handleUnlock} className="space-y-4">
              <input 
                type="password" 
                placeholder="Account Password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-sahas-dark border border-sahas-border rounded-2xl px-5 py-4 text-sm font-dm text-sahas-text outline-none focus:border-sahas-red/40 transition-all"
                autoFocus
              />
              {error && <p className="text-xs text-sahas-red font-dm text-center animate-shake">{error}</p>}
              
              <div className="flex gap-3 mt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowAuthOverlay(false);
                    setPendingAction(null);
                    setPassword('');
                  }}
                  className="flex-1 py-4 rounded-2xl border border-sahas-border text-sahas-soft font-dm font-bold text-xs uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isVerifying}
                  className="flex-1 py-4 rounded-2xl bg-sahas-red text-white font-syne font-bold text-xs uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all"
                >
                  {isVerifying ? 'Wait...' : 'Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal confirmation overlay */}
      {confirmOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-6">
          <div
            className="w-full max-w-xs rounded-3xl p-6 shadow-2xl bg-sahas-card border border-sahas-border animate-scale-in"
          >
            <div className="text-center mb-5">
              <h3 className="font-syne font-bold text-lg text-sahas-text">{confirmOverlay.title}</h3>
              <p className="font-dm text-sm text-sahas-soft mt-1">
                {confirmOverlay.message}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOverlay(null)}
                className="flex-1 py-3 rounded-xl font-dm text-xs uppercase tracking-widest text-sahas-soft border border-sahas-border bg-sahas-dark transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={confirmOverlay.onConfirm}
                className="flex-1 py-3 rounded-xl font-dm font-bold text-xs uppercase tracking-widest text-white transition-all active:scale-95 shadow-lg shadow-sahas-red/20"
                style={{ background: 'linear-gradient(135deg, #FF2D55 0%, #FF6B35 100%)' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 pt-4 pb-6">
        <p className="text-sahas-soft text-xs font-dm tracking-widest uppercase">Account</p>
        <h1 className="font-syne font-800 text-2xl text-sahas-text mt-0.5">
          Profile &amp; Settings <span className="text-sahas-red">.</span>
        </h1>
      </div>

      <div className="px-5 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-4 mb-2">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center font-syne font-800 text-xl"
                style={{
                  background: 'rgba(0,214,143,0.12)',
                  border: '2px solid rgba(0,214,143,0.3)',
                  color: '#00D68F',
                }}
              >
                {displayInitials}
              </div>
              <span
                className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white"
                style={{ background: '#00D68F' }}
              />
            </div>
            <div className="flex-1">
              {editingProfile ? (
                 <div className="space-y-2">
                   <input
                     type="text"
                     value={profileName}
                     onChange={(e) => setProfileName(e.target.value)}
                     className="w-full bg-sahas-dark border border-sahas-border rounded-lg px-3 py-1.5 text-sm font-dm text-sahas-text outline-none focus:border-sahas-teal/60 transition-colors"
                     autoFocus
                   />
                   <div className="flex gap-2">
                     <button
                       onClick={() => {
                          if (!profileName.trim()) return showToast('Name required', 'error');
                          updateProfile({ fullName: profileName });
                          setEditingProfile(false);
                          showToast('Profile updated', 'success');
                       }}
                       className="px-3 py-1.5 rounded-lg bg-sahas-teal text-sahas-dark text-xs font-dm font-bold"
                     >
                       Save
                     </button>
                     <button
                       onClick={() => setEditingProfile(false)}
                       className="px-3 py-1.5 rounded-lg border border-sahas-muted text-sahas-soft text-xs font-dm"
                     >
                       Cancel
                     </button>
                   </div>
                 </div>
              ) : (
                <>
                  <h2 className="font-syne font-700 text-lg text-sahas-text">{displayName}</h2>
                  <p className="text-xs font-dm text-sahas-soft">{displayEmail}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="text-[10px] font-dm px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,214,143,0.12)', color: '#00D68F' }}
                    >
                      ✓ Verified
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Safety Dashboard (PREMIUM) */}
      <div className="px-5 mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="grid grid-cols-3 gap-2">
          {/* Network Health */}
          <div className="bg-sahas-card border border-sahas-border rounded-2xl p-3 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full bg-sahas-teal/10 flex items-center justify-center mb-1.5">
              <span className="text-xs">📡</span>
            </div>
            <p className="text-[10px] font-dm text-sahas-soft uppercase tracking-tighter">Network</p>
            <p className={`font-syne font-800 text-xs mt-0.5 ${contacts.filter(c => c.isLinked).length >= 2 ? 'text-sahas-green' : (contacts.filter(c => c.isLinked).length > 0 ? 'text-sahas-amber' : 'text-sahas-red')}`}>
              {contacts.filter(c => c.isLinked).length >= 2 ? 'Strong' : (contacts.filter(c => c.isLinked).length > 0 ? 'Stable' : 'Weak')}
            </p>
          </div>

          {/* Safety Streak */}
          <div className="bg-sahas-card border border-sahas-border rounded-2xl p-3 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full bg-sahas-red/10 flex items-center justify-center mb-1.5">
              <span className="text-xs">🔥</span>
            </div>
            <p className="text-[10px] font-dm text-sahas-soft uppercase tracking-tighter">Streak</p>
            <p className="font-syne font-800 text-xs text-sahas-text mt-0.5">
              {user?.personalInfo?.streak?.count || 
               (typeof user?.personalInfo?.streak === 'number' ? user.personalInfo.streak : 
                parseInt(localStorage.getItem('sahasya_streak_count') || '0'))} Days
            </p>
          </div>

          {/* Map Impact */}
          <div className="bg-sahas-card border border-sahas-border rounded-2xl p-3 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full bg-sahas-amber/10 flex items-center justify-center mb-1.5">
              <span className="text-xs">📍</span>
            </div>
            <p className="text-[10px] font-dm text-sahas-soft uppercase tracking-tighter">Impact</p>
            <p className="font-syne font-800 text-xs text-sahas-text mt-0.5">
              {user?.stats?.reportsCount || 0} Pins
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 mb-6 flex flex-col gap-3">
        <button 
          onClick={onOpenAboutMe}
          className="w-full flex items-center justify-between p-4 bg-sahas-card border border-sahas-border rounded-2xl hover:border-sahas-red/30 transition-all group active:scale-[0.98]"
        >
          <div className="text-left">
            <p className="text-sm font-dm text-sahas-text font-semibold">About Me</p>
            <p className="text-[10px] font-dm text-sahas-soft uppercase tracking-wider">Identity & Medical Info</p>
          </div>
          <span className="text-sahas-soft group-hover:text-sahas-red transition-colors">→</span>
        </button>

        <button 
          onClick={() => setShowLegalGuide(true)}
          className="w-full flex items-center justify-between p-4 bg-sahas-card border border-sahas-border rounded-2xl hover:border-sahas-teal/30 transition-all group active:scale-[0.98]"
        >
          <div className="text-left">
            <p className="text-sm font-dm text-sahas-text font-semibold">Legal Guide</p>
            <p className="text-[10px] font-dm text-sahas-soft uppercase tracking-wider">Know Your Rights</p>
          </div>
          <span className="text-sahas-soft group-hover:text-sahas-teal transition-colors">→</span>
        </button>
      </div>

      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-dm text-sahas-soft uppercase tracking-wider">Trusted Contacts</p>
          {editing === null && (
            <button onClick={openAdd} className="text-xs text-sahas-teal font-dm p-2 -m-2 active:scale-95 transition-transform">+ Add</button>
          )}
        </div>

        {editing !== null && (
          <Card className="p-4 mb-4 border border-sahas-teal/40 animate-scale-in">
            <p className="text-xs font-dm text-sahas-teal mb-3 uppercase tracking-wider">
              {editing === 'new' ? '+ New Contact' : '✎ Edit Contact'}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-dm text-sahas-soft mb-1 block">
                  Name <span className="text-sahas-red">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveContact()}
                  placeholder="Contact Name"
                  maxLength={30}
                  autoFocus
                  className="w-full bg-sahas-dark border border-sahas-border rounded-xl px-4 py-2.5 text-sm font-dm text-sahas-text outline-none focus:border-sahas-teal/60 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-dm text-sahas-soft mb-1 block">
                  Phone <span className="text-sahas-red">*</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveContact()}
                  placeholder="Phone Number"
                  className="w-full bg-sahas-dark border border-sahas-border rounded-xl px-4 py-2.5 text-sm font-dm text-sahas-text outline-none focus:border-sahas-teal/60 transition-colors"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveContact}
                  className="flex-1 py-2.5 rounded-xl bg-sahas-teal text-sahas-dark text-sm font-dm font-bold active:scale-95 transition-all"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex-1 py-2.5 rounded-xl border border-sahas-muted bg-sahas-card text-sahas-soft text-sm font-dm active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-2">
          {contacts.map((c) => (
            <Card key={c.id} className="p-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-syne font-700 text-sm flex-shrink-0"
                  style={{ background: `${c.color}20`, border: `2px solid ${c.color}40`, color: c.color }}
                >
                  {c.initials}
                </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-dm text-sahas-text truncate">{c.name}</p>
                      {c.isLinked ? (
                        <span className="text-[9px] font-dm text-[#0088CC] border border-[#0088CC]/30 px-1 py-0.5 rounded bg-[#0088CC]/10 uppercase">Linked</span>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-[9px] font-dm text-sahas-orange border border-sahas-orange/30 px-1 py-0.5 rounded bg-sahas-orange/10 uppercase" title="Invite contact to use Sahasya Telegram Bot">Not Linked</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-dm text-sahas-soft truncate">{c.phone || 'No phone'}</p>
                  </div>
                {editing !== c.id && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openEdit(c)}
                      className="w-7 h-7 rounded-lg bg-sahas-dark border border-sahas-border flex items-center justify-center text-xs text-sahas-soft hover:text-sahas-teal transition-colors"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => removeContact(c.id)}
                      className="w-7 h-7 rounded-lg bg-sahas-dark border border-sahas-border flex items-center justify-center text-xs text-sahas-soft hover:text-sahas-red transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="px-5 mb-5">
        <p className="text-xs font-dm text-sahas-soft mb-3 uppercase tracking-wider">Account Actions</p>
        <div className="space-y-3">
          {!editingProfile && (
            <button
              onClick={() => handleActionWithAuth(() => {
                setProfileName(displayName);
                setEditingProfile(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              })}
              className="w-full text-left p-4 rounded-xl bg-sahas-card border border-sahas-border text-sahas-text text-sm font-dm flex justify-between items-center transition-colors hover:border-sahas-teal/50"
            >
              <span>Edit Profile Name</span>
              <span className="text-sahas-soft">✎</span>
            </button>
          )}

          <button
            onClick={() => setConfirmOverlay({
              title: 'Log out?',
              message: "You'll need to sign in again to access Sahasya.",
              onConfirm: () => { setConfirmOverlay(null); onLogout(); }
            })}
            className="w-full py-4 rounded-xl border font-dm text-sm flex justify-center items-center gap-2 transition-colors hover:bg-red-50"
            style={{ borderColor: 'rgba(255,45,85,0.3)', color: '#FF2D55' }}
          >
            Log Out Account
          </button>
        </div>
      </div>
    </div>
  );
}
