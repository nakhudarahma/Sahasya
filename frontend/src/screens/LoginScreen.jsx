import React, { useState } from 'react';
import { Toast } from '../components/UI.jsx';

export default function LoginScreen({ onLogin, onGoSignup }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim())    return setError('Please enter your email address.');
    if (!password)        return setError('Please enter your password.');

    setLoading(true);
    // Tiny artificial delay for UX feel
    await new Promise((r) => setTimeout(r, 500));
    const result = await onLogin(email, password);
    setLoading(false);
    
    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-sahas-dark flex flex-col items-center justify-center px-6 relative">
      {error && (
        <Toast 
          message={error} 
          type="danger" 
          onClose={() => setError('')} 
        />
      )}

      {/* Decorative blobs */}
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF2D55 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF6B35 0%, transparent 70%)' }}
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
          <p className="font-dm text-sahas-soft text-sm mt-0.5">Your personal safety companion</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-6 shadow-xl bg-sahas-card border border-sahas-border">
          <h2 className="font-syne font-bold text-xl text-sahas-text mb-1">Welcome back</h2>
          <p className="font-dm text-sahas-soft text-sm mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Email */}
            <div>
              <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="you@example.com"
                autoComplete="email"
                className={`w-full rounded-xl px-4 py-3 font-dm text-sm text-sahas-text bg-sahas-dark border transition-all outline-none focus:border-sahas-red ${error && !email.trim() ? 'border-sahas-red' : 'border-sahas-border'}`}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block font-dm text-xs font-medium text-sahas-soft mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 pr-12 font-dm text-sm text-sahas-text bg-sahas-dark border border-sahas-border transition-all outline-none focus:border-sahas-red"
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

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-slide-up">
                <span className="text-base">⚠️</span>
                <p className="font-dm text-xs text-red-600">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-syne font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-60 mt-2"
              style={{
                background: loading
                  ? '#F8BBD0'
                  : 'linear-gradient(135deg, #FF2D55 0%, #FF6B35 100%)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(255,45,85,0.35)',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Signup link */}
        <p className="text-center font-dm text-sm text-sahas-soft mt-6">
          Don't have an account?{' '}
          <button
            id="go-signup"
            onClick={onGoSignup}
            className="font-semibold transition-colors text-sahas-red"
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
