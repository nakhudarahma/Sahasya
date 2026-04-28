// Shared UI Components for SAHAS

import React from 'react';

// Status Badge
export const StatusBadge = ({ status }) => {
  const styles = {
    safe: 'bg-sahas-green/20 text-sahas-green border-sahas-green/30',
    danger: 'bg-sahas-red/20 text-sahas-red border-sahas-red/30',
    caution: 'bg-sahas-amber/20 text-sahas-amber border-sahas-amber/30',
    resolved: 'bg-sahas-green/20 text-sahas-green border-sahas-green/30',
    reported: 'bg-sahas-teal/20 text-sahas-teal border-sahas-teal/30',
    review: 'bg-sahas-amber/20 text-sahas-amber border-sahas-amber/30',
  };
  return (
    <span className={`text-xs font-dm font-medium px-2 py-0.5 rounded-full border ${styles[status] || styles.caution}`}>
      {status}
    </span>
  );
};

// Card component
export const Card = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-sahas-card border border-sahas-border rounded-2xl ${onClick ? 'cursor-pointer active:scale-98 transition-transform' : ''} ${className}`}
  >
    {children}
  </div>
);

// Icon Button
export const IconBtn = ({ icon, label, onClick, color = 'border-sahas-border', active = false }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95 ${
      active ? 'bg-sahas-red/10 border-sahas-red/40' : `bg-sahas-card ${color} hover:border-sahas-muted`
    }`}
  >
    <span className="text-2xl">{icon}</span>
    <span className="text-xs font-dm text-sahas-soft whitespace-nowrap">{label}</span>
  </button>
);

// Avatar
export const Avatar = ({ initials, color = '#FF6B35', size = 'md' }) => {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-syne font-700`}
      style={{ background: `${color}22`, border: `1.5px solid ${color}44`, color }}
    >
      {initials}
    </div>
  );
};

// Section Header
export const SectionHeader = ({ title, action, onAction }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="font-syne font-600 text-sm text-sahas-soft uppercase tracking-widest">{title}</h3>
    {action && (
      <button onClick={onAction} className="text-xs text-sahas-teal font-dm hover:opacity-80">
        {action}
      </button>
    )}
  </div>
);

// Divider
export const Divider = () => (
  <div className="h-px bg-sahas-border my-4" />
);

// Toggle Switch
export const Toggle = ({ enabled, onChange, label }) => (
  <div className="flex items-center justify-between">
    {label && <span className="text-sm font-dm text-sahas-text">{label}</span>}
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-sahas-green' : 'bg-sahas-muted'}`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`}
      />
    </button>
  </div>
);

// Progress Ring
export const ProgressRing = ({ progress, size = 120, stroke = 8, color = '#FF2D55', children }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="countdown-ring">
        {/* Track circle — tinted version of active color so idle ring shows */}
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeOpacity="0.15" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

// Toast notification
export const Toast = ({ message, type = 'info', onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    info: 'bg-sahas-teal/20 border-sahas-teal/30 text-sahas-teal',
    success: 'bg-sahas-green/20 border-sahas-green/30 text-sahas-green',
    danger: 'bg-sahas-red/20 border-sahas-red/30 text-sahas-red',
    warning: 'bg-sahas-amber/20 border-sahas-amber/30 text-sahas-amber',
  };
  return (
    <div className={`fixed top-4 left-4 right-4 z-50 flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-sm ${colors[type]} animate-slide-up`}>
      <span className="flex-1 text-sm font-dm">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 text-lg leading-none">×</button>
    </div>
  );
};

// Theme Toggle
export const ThemeToggle = ({ className = '' }) => {
  const [isDark, setIsDark] = React.useState(() => {
    return localStorage.getItem('sahas-theme') === 'dark';
  });

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sahas-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sahas-theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg bg-sahas-card border border-sahas-border text-sahas-soft hover:text-sahas-text transition-colors shadow-sm ${className}`}
      aria-label="Toggle theme"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
};
