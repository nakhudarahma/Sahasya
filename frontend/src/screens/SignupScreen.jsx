import React, { useState } from 'react';
import { Toast } from '../components/UI.jsx';

// Palette for contact avatars
const COLORS = ['#FF6B35', '#00D68F', '#00C4CC', '#FF2D55', '#FFB800', '#7C3AED'];

const emptyContact = () => ({ id: Date.now() + Math.random(), name: '', phone: '' });

export default function SignupScreen({ onSignup, onGoLogin }) {
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [showPass,  setShowPass]  = useState(false);
  const [contacts,  setContacts]  = useState([emptyContact()]);
  const [success,   setSuccess]   = useState('');

  const addContact    = () => setContacts((cs) => [...cs, emptyContact()]);
  const removeContact = (id) => setContacts((cs) => cs.filter((c) => c.id !== id));
  const updateContact = (id, field, val) =>
    setContacts((cs) => cs.map((c) => (c.id === id ? { ...c, [field]: val } : c)));

  const validate = () => {
    if (!name.trim())                          return 'Please enter your full name.';
    if (!email.trim() || !email.includes('@')) return 'Please enter a valid email address.';
    if (password.length < 6)                   return 'Password must be at least 6 characters.';
    if (password !== confirm)                  return 'Passwords do not match.';
    
    const hasValidContact = contacts.some((c) => c.name.trim() && c.phone.trim());
    if (!hasValidContact) return 'Please add at least one emergency contact (name and phone).';

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validationError = validate();
    if (validationError) return setError(validationError);

    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const result = await onSignup(name, email, password, contacts);
    setLoading(false);
    
    if (result.success) {
      setSuccess('Account created! Please check your email for a confirmation link before signing in.');
    } else {
      setError(result.error);
    }
  };

  const inputBase = {
    className:
      'w-full rounded-xl px-4 py-3 font-dm text-sm text-sahas-text bg-sahas-dark border border-sahas-border transition-all outline-none focus:border-sahas-red',
  };

  return (
    <div className="min-h-screen bg-sahas-dark flex flex-col items-center justify-center px-6 py-10 relative">
      {(success || error) && (
        <Toast 
          message={success || error} 
          type={success ? 'success' : 'danger'} 
          onClose={() => { setSuccess(''); setError(''); }} 
        />
      )}

      {/* Decorative blobs */}
      <div
        className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF6B35 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF2D55 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-sm animate-scale-in">

        {/* Brand */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-0">
            <img
              src="/logo.png"
              alt="Sahasya logo"
              className="w-44 h-44 object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="font-brand font-extrabold text-4xl italic tracking-tight -mt-14 brand-title">
            Sahasya
          </h1>
          <p className="font-dm text-sahas-soft text-sm mt-0.5">Stay safe. Stay connected.</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-6 shadow-xl bg-sahas-card border border-sahas-border">
          <h2 className="font-syne font-bold text-xl text-sahas-text mb-6">Create account</h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Full Name */}
            <div>
              <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder="Priya Sharma"
                autoComplete="name"
                {...inputBase}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="you@example.com"
                autoComplete="email"
                {...inputBase}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  {...inputBase}
                  className={`${inputBase.className} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sahas-soft hover:text-sahas-text transition-colors text-xs font-dm uppercase tracking-wider font-semibold"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                id="signup-confirm"
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                placeholder="Re-enter password"
                autoComplete="new-password"
                className={`${inputBase.className} ${confirm && confirm !== password ? 'border-sahas-red' : ''}`}
              />
              {confirm && confirm !== password && (
                <p className="font-dm text-xs text-red-500 mt-1 ml-1">Passwords don't match</p>
              )}
            </div>

            {/* Emergency Contacts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block font-dm text-xs font-medium text-sahas-soft uppercase tracking-wider">
                  Emergency Contacts
                  <span className="ml-1 text-sahas-red/80 normal-case tracking-normal">(required)</span>
                </label>
                <button
                  type="button"
                  onClick={addContact}
                  className="text-xs font-dm font-semibold px-2.5 py-1 rounded-lg transition-colors text-sahas-red bg-sahas-red/10"
                >
                  + Add
                </button>
              </div>

              <div className="space-y-2">
                {contacts.map((c, idx) => (
                  <div
                    key={c.id}
                    className="rounded-xl p-3 bg-sahas-dark border border-sahas-border relative"
                  >
                    {/* Avatar + index */}
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-syne font-bold text-white flex-shrink-0"
                        style={{ background: COLORS[idx % COLORS.length] }}
                      >
                        {idx + 1}
                      </div>
                      <span className="font-dm text-xs text-sahas-soft">Contact {idx + 1}</span>
                      {contacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeContact(c.id)}
                          className="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors"
                          aria-label="Remove contact"
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => updateContact(c.id, 'name', e.target.value)}
                        placeholder="Full name"
                        className="rounded-lg px-3 py-2 font-dm text-xs text-sahas-text bg-sahas-dark border border-sahas-border outline-none transition-all focus:border-sahas-red"
                      />
                      <input
                        type="tel"
                        value={c.phone}
                        onChange={(e) => updateContact(c.id, 'phone', e.target.value)}
                        placeholder="Phone number"
                        className="rounded-lg px-3 py-2 font-dm text-xs text-sahas-text bg-sahas-dark border border-sahas-border outline-none transition-all focus:border-sahas-red"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-slide-up">
                <span className="text-base">⚠️</span>
                <p className="font-dm text-xs text-red-600">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-syne font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-60 mt-2"
              style={{
                background: loading
                  ? '#F8BBD0'
                  : 'linear-gradient(135deg, #FF6B35 0%, #FF2D55 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(255,45,85,0.35)',
              }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p className="text-center font-dm text-sm text-sahas-soft mt-6">
          Already have an account?{' '}
          <button
            id="go-login"
            onClick={onGoLogin}
            className="font-semibold transition-colors text-sahas-red"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
