import React, { useState, useEffect } from 'react';
import { Card, Toast } from '../components/UI.jsx';

const SELECTED_KEY = 'sahas_fake_caller_selected';
const CONTACT_COLORS = ['#FF6B35', '#00D68F', '#00C4CC', '#9B59B6', '#FFB800', '#7C3AED'];

function loadSelectedId(contacts) {
  try {
    const id = localStorage.getItem(SELECTED_KEY);
    if (id && contacts.find((c) => c.id === id)) return id;
  } catch (_) {}
  return contacts[0]?.id || null;
}

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

const DELAY_OPTIONS = [
  { label: 'Now', value: 0 },
  { label: '3s', value: 3 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
];

export default function FakeCallSettingsScreen({ onTriggerCall, user }) {
  const contacts = user?.emergencyContacts || [];
  const [selectedId, setSelectedId] = useState(() => loadSelectedId(contacts));
  const [delay, setDelay] = useState(3);
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!selectedId && contacts.length > 0) {
      setSelectedId(contacts[0].id);
    }
  }, [contacts, selectedId]);

  useEffect(() => {
    if (selectedId) localStorage.setItem(SELECTED_KEY, selectedId);
  }, [selectedId]);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleTrigger = () => {
    const contact = contacts.find((c) => c.id === selectedId);
    if (!contact) {
      showToast('No emergency contacts available', 'danger');
      return;
    }
    onTriggerCall(contact, delay);
  };

  const handleCustomConfirm = () => {
    const val = parseInt(customInput, 10);
    if (!val || val < 1 || val > 3600) {
      showToast('Enter a valid number (1–3600 seconds)', 'danger');
      return;
    }
    setDelay(val);
    setShowCustom(false);
    setCustomInput('');
  };

  const selectedContact = contacts.find((c) => c.id === selectedId);

  return (
    <div className="min-h-screen bg-sahas-dark noise screen-enter pb-28 overflow-y-auto">
      {toast && (
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <p className="text-sahas-soft text-xs font-dm tracking-widest uppercase">Escape Tool</p>
        <h1 className="font-syne font-800 text-2xl text-sahas-text mt-0.5">
          Fake Call <span className="text-sahas-red">.</span>
        </h1>
        <p className="text-sahas-soft text-xs font-dm mt-1.5">
          Simulate an incoming call to exit uncomfortable situations
        </p>
      </div>

      {/* Contacts Section */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-dm text-sahas-soft uppercase tracking-wider">
            Callers
          </p>
        </div>

        {/* Contact List */}
        <div className="space-y-2">
          {contacts.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">📞</p>
              <p className="text-sahas-soft font-dm text-sm">No contacts available</p>
              <p className="text-sahas-muted font-dm text-xs mt-1">
                Please add emergency contacts in your Profile
              </p>
            </div>
          )}

          {contacts.map((contact, index) => {
            const isSelected = contact.id === selectedId;
            return (
              <div
                key={contact.id}
                onClick={() => setSelectedId(contact.id)}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-sahas-teal/50 bg-sahas-teal/5'
                    : 'border-sahas-border bg-sahas-card hover:border-sahas-muted'
                }`}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-syne font-700 text-sm flex-shrink-0"
                  style={{
                    background: `${CONTACT_COLORS[index % CONTACT_COLORS.length]}22`,
                    border: `2px solid ${CONTACT_COLORS[index % CONTACT_COLORS.length]}55`,
                    color: CONTACT_COLORS[index % CONTACT_COLORS.length],
                  }}
                >
                  {getInitials(contact.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-dm text-sahas-text truncate">{contact.name}</p>
                  <p className="text-xs font-dm text-sahas-soft truncate">
                    {contact.phone || 'No number'}
                  </p>
                </div>

                {/* Selected check */}
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-sahas-teal flex items-center justify-center flex-shrink-0">
                    <span className="text-sahas-dark text-xs font-bold leading-none">✓</span>
                  </div>
                )}

                {/* Edit / Delete disabled — manages via Profile now */}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ring After (Delay) */}
      <div className="px-5 mb-6">
        <p className="text-xs font-dm text-sahas-soft mb-3 uppercase tracking-wider">
          Ring after
        </p>
        <div className="flex gap-2 flex-wrap">
          {DELAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setDelay(opt.value); setShowCustom(false); setCustomInput(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-dm font-medium transition-all ${
                delay === opt.value && !showCustom
                  ? 'bg-sahas-teal text-sahas-dark'
                  : 'bg-sahas-card border border-sahas-border text-sahas-soft hover:border-sahas-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setShowCustom(v => !v)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-dm font-medium transition-all ${
              showCustom
                ? 'bg-sahas-amber text-sahas-dark'
                : 'bg-sahas-card border border-sahas-border text-sahas-soft hover:border-sahas-muted'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Custom seconds input */}
        {showCustom && (
          <div className="flex gap-2 mt-3">
            <input
              type="number"
              min="1"
              max="3600"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomConfirm()}
              placeholder="Seconds (e.g. 30)"
              className="flex-1 bg-sahas-dark border border-sahas-border rounded-xl px-4 py-2.5 text-sm font-dm text-sahas-text outline-none focus:border-sahas-teal/60 transition-colors"
              autoFocus
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

      {/* Trigger Button */}
      <div className="px-5">
        <button
          onClick={handleTrigger}
          disabled={!selectedContact}
          className={`w-full py-4 rounded-2xl font-syne font-700 text-sm active:scale-98 transition-all ${
            selectedContact
              ? 'bg-gradient-to-r from-sahas-teal to-blue-500 text-white'
              : 'bg-sahas-card border border-sahas-border text-sahas-muted cursor-not-allowed'
          }`}
          style={
            selectedContact
              ? { boxShadow: '0 8px 24px rgba(0,196,204,0.3)' }
              : {}
          }
        >
          {selectedContact
            ? `📞 Call from ${selectedContact.name}${delay > 0 ? ` (in ${delay}s)` : ' — Now'}`
            : 'Select a contact above first'}
        </button>
        <p className="text-center text-xs font-dm text-sahas-muted mt-3">
          Tap the button, then put your phone in your pocket
        </p>
      </div>
    </div>
  );
}
