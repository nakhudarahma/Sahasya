/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        brand: ['Inter', 'sans-serif'],
        syne: ['Syne', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
      },
      colors: {
        sahas: {
          red: '#FF2D55',
          orange: '#FF6B35',
          amber: '#FFB800',
          green: '#00D68F',
          teal: '#00C4CC',
          dark: '#FFFFFF',
          card: '#FCE4EC',
          border: '#F8BBD0',
          muted: '#F8BBD0',
          text: '#111827',
          soft: '#6B7280',
        }
      },
      animation: {
        'pulse-sos': 'pulse-sos 1.5s ease-in-out infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'blink': 'blink 1s step-end infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
      },
      keyframes: {
        'pulse-sos': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,45,85,0.7)' },
          '50%': { boxShadow: '0 0 0 30px rgba(255,45,85,0)' },
        },
        blink: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0 },
        },
        'slide-up': {
          from: { transform: 'translateY(20px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
        'slide-in': {
          from: { transform: 'translateX(-20px)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 1 },
        },
        'fade-in': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        'scale-in': {
          from: { transform: 'scale(0.9)', opacity: 0 },
          to: { transform: 'scale(1)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
