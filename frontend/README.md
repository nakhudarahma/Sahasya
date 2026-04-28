# Project SAHAS – Frontend

**Intelligent Women Safety, Evidence Capture, and Anonymous Justice System**

> "SAHAS doesn't just call for help — it ensures what happened cannot be denied."

---

## Quick Start (Standalone HTML)

Open `SAHAS_App.html` in any browser — no install needed. All 8 screens work immediately.

---

## React Project Setup

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

---

## Project Structure

```
src/
├── App.jsx                  # Root component, navigation, overlays
├── main.jsx                 # React entry point
├── index.css                # Global styles + Tailwind
├── components/
│   ├── BottomNav.jsx        # Bottom tab bar
│   └── UI.jsx               # Shared UI (Card, Avatar, Toggle, Toast, etc.)
├── data/
│   └── mockData.js          # All mock data
└── screens/
    ├── HomeScreen.jsx        # Dashboard + SOS button
    ├── EmergencyScreen.jsx   # SOS activated (countdown + recording + alerts)
    ├── TrackScreen.jsx       # Live journey tracker + map
    ├── MapScreen.jsx         # Safety heatmap + community reports
    ├── TimerScreen.jsx       # Check-in timer with countdown ring
    ├── FakeCallScreen.jsx    # Fake incoming call simulator
    ├── ReportScreen.jsx      # Anonymous incident report form
    └── ProfileScreen.jsx     # User profile + settings + Telegram
```

---

## Screens & Features

| Screen | Features |
|--------|----------|
| **Home Dashboard** | SOS button, quick actions, voice trigger status, emergency contacts, safety tips, area safety demo |
| **Emergency Alert** | 5s countdown, SOS animation, recording indicators, evidence timeline, contact alert status |
| **Live Tracking** | SVG map with animated path, journey details, shareable link generation, location history |
| **Safety Heatmap** | Interactive zones (danger/caution/safe), filter by type, selected zone info, community report form |
| **Check-in Timer** | Countdown ring, preset durations, warning phase, auto-SOS simulation |
| **Fake Call** | Caller selection, ring delay, full-screen call UI, accept/reject |
| **Anonymous Report** | Incident type, description, evidence upload, escalation levels, report history |
| **Profile** | User stats, contact management, voice trigger edit, Telegram linking, privacy info |

---

## Design System

| Token | Value |
|-------|-------|
| Background | `#0A0A0F` |
| Card | `#12121A` |
| Border | `#1E1E2E` |
| Danger | `#FF2D55` |
| Caution | `#FFB800` |
| Safe | `#00D68F` |
| Teal | `#00C4CC` |
| Font Display | Syne (800/700) |
| Font Body | DM Sans (400/500) |

---

## Tech Stack

- **React 18** – functional components + hooks
- **Tailwind CSS 3** – utility-first styling
- **Vite 5** – fast dev server and build
- **No backend** – all data is mocked for demo

---

## Navigation Flow

```
Home ──────── SOS Press ──► Emergency Screen (overlay)
  │
  ├── Quick Action: Check-in ──► Timer Screen (overlay)
  ├── Quick Action: Fake Call ──► Fake Call Screen (overlay)
  │
Bottom Nav ──► Map | Track | Report | Profile
```

---

## Demo Notes

- Press the **SOS button** to activate emergency mode
- **Fake Call**: setup a caller, set delay, trigger, then accept/reject
- **Check-in Timer**: start 5m timer, watch warning phase near end
- **Heatmap**: tap zones, filter by type, toggle report mode and click map
- **Report**: fill form → submit → see evidence timeline
- The **safety level demo** on home changes the area status pill
