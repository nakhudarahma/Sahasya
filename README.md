# SAHASYA (सहस्य)
### *Empowering Women. Ensuring Safety. Anytime, Anywhere.*

**Sahasya** is a robust, full-stack safety ecosystem designed to bridge the gap between immediate physical danger and rapid emergency response. It leverages modern web technologies to provide a fail-safe communication layer for women in distress.

---

## The Problem
Traditional safety apps often fail due to slow response times or reliance on fragile communication channels. In critical moments, a woman needs a system that is **instant**, **failsafe**, and **integrated** into platforms where her trusted contacts are already active.

## Key Features

### Hybrid SOS Infrastructure
One-touch emergency activation that triggers an instant alert system:
*   **Instant Telegram Alerts**: Sends real-time location and distress messages to linked emergency contacts via a dedicated bot.
*   **Encrypted Data Transmission**: Ensures that SOS signals are transmitted securely and prioritized.


### Live Intelligent Tracking
*   **Real-time Geo-location**: High-precision tracking using Google Maps API.
*   **Safety Shortcuts**: Quick-select destinations like "Home" or "Office" for one-tap navigation and tracking.

### Safety Dashboard
*   **Safety Streak**: Gamified daily check-ins to encourage consistent safety awareness.
*   **Incident Feed**: Historical data of past alerts and safety checkpoints.

### Digital Legal Companion
*   **Rights at Your Fingertips**: A curated, offline-ready database of Indian legal rights and emergency protocols for women.

---

## Technical Architecture

### **Core Stack**
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion (Animations)
- **Backend**: Node.js & Express (TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Infrastructure**: Telegram Bot API, Vonage SMS Gateway, Google Maps SDK

### **Security & Performance**
- **Encryption**: Secure JWT-based authentication.
- **Speed**: Optimized for low-latency emergency triggers.
- **Relatability**: Fully documented database schema for easy scaling.

---

## Quick Start

### 1. Prerequisites
- Node.js (v20+)
- Supabase Project & Google Cloud Project (Maps API)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/sahasya.git
cd sahasya

# Install all dependencies
cd backend && npm install
cd ../frontend && npm install
```

### 3. Environment Configuration
Create a `.env` file in both `frontend` and `backend` directories.  

**Backend `.env` keys:**
- `SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Required for automated contact linking.
- `TELEGRAM_BOT_TOKEN`: Obtain this from [@BotFather](https://t.me/botfather) on Telegram.
- `GOOGLE_MAPS_API_KEY`: Required for reverse geocoding in SOS alerts.
- `FRONTEND_URL`: The URL where your frontend is hosted (used for tracking links).

### 4. Running the Project
```bash
# On Mac:
chmod +x start_sahasya.sh
./start_sahasya.sh

# Manually:
# Terminal 1 (Backend + Bot): cd backend && npm run dev
# Terminal 2 (Frontend): cd frontend && npm run dev
```

> [!NOTE]
> The **Telegram Bot** is integrated into the backend server. Starting the backend automatically starts the bot polling service.

---

## Telegram Bot Integration
To receive SOS alerts, users and their emergency contacts must link their Telegram accounts:
1. Search for your bot on Telegram (using the name you gave `@BotFather`).
2. Send `/start`.
3. Click the **"📲 Link My Phone Number"** button.
4. Once linked, the bot will instantly route SOS alerts from Sahasya to your Telegram chat.
