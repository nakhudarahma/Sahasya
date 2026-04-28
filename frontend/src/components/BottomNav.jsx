import React from 'react';

const tabs = [
  { id: 'home', label: 'Home', icon: '🛡️' },
  { id: 'map', label: 'Map', icon: '🗺️' },
  { id: 'track', label: 'Track', icon: '📍' },
  { id: 'report', label: 'Report', icon: '📋' },
  { id: 'vault', label: 'Vault', icon: '🗄️' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-sahas-card/90 backdrop-blur-xl border-t border-sahas-border">
      <div className="flex items-center justify-between px-1 py-1.5 w-full max-w-lg mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${
              active === tab.id
                ? 'text-sahas-red'
                : 'text-sahas-soft hover:text-sahas-text'
            }`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className={`text-[9px] sm:text-[10px] font-dm font-medium leading-none ${active === tab.id ? 'text-sahas-red' : ''}`}>
              {tab.label}
            </span>
            {active === tab.id && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sahas-red" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
