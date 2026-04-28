-- ============================================================================
-- SAHASYA — Supabase Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- 1. PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  initials TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  personal_info JSONB DEFAULT '{}',
  vault_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. EMERGENCY CONTACTS
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. INCIDENTS (Evidence Vault)
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  location TEXT DEFAULT 'Unknown',
  duration_seconds INTEGER DEFAULT 0,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. INCIDENT TIMELINE (child rows of incidents)
CREATE TABLE IF NOT EXISTS incident_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  time TEXT NOT NULL,
  event TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- 5. REPORTS
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT true,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  escalation TEXT DEFAULT 'store',
  has_evidence BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SAFETY HOTSPOTS (Map screen zones)
CREATE TABLE IF NOT EXISTS safety_hotspots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('danger', 'caution', 'safe')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius INTEGER DEFAULT 50,
  description TEXT,
  risk_level INTEGER DEFAULT 1,
  peak_time TEXT,
  upvotes INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. HELP CENTERS (Police, Hospitals, NGOs)
CREATE TABLE IF NOT EXISTS help_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('police', 'hospital', 'ngo', 'other')),
  address TEXT,
  phone TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  operating_hours TEXT DEFAULT '24/7',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. SAFETY STATISTICS (For dashboard & PPT)
CREATE TABLE IF NOT EXISTS safety_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  source TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. TRACKING SESSIONS (Live Tracker)
CREATE TABLE IF NOT EXISTS tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  destination TEXT,
  share_link TEXT,
  is_active BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_hotspots ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users read own profile"    ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile"  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Insert profile on signup"  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Emergency Contacts
CREATE POLICY "Users manage own contacts" ON emergency_contacts FOR ALL USING (auth.uid() = user_id);

-- Incidents
CREATE POLICY "Users manage own incidents" ON incidents FOR ALL USING (auth.uid() = user_id);

-- Incident Timeline (access through parent incident ownership)
CREATE POLICY "Users manage own timeline" ON incident_timeline FOR ALL
  USING (incident_id IN (SELECT id FROM incidents WHERE user_id = auth.uid()));

-- Reports (owner or anonymous)
CREATE POLICY "Users read own reports"   ON reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert reports"     ON reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Users delete own reports" ON reports FOR DELETE USING (auth.uid() = user_id);

-- Safety Hotspots (public read, authenticated write)
CREATE POLICY "Anyone can read hotspots"  ON safety_hotspots FOR SELECT USING (true);
CREATE POLICY "Auth users report hotspots" ON safety_hotspots FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth users upvote hotspots" ON safety_hotspots FOR UPDATE USING (true);

-- Help Centers (public read)
CREATE POLICY "Anyone can read help centers" ON help_centers FOR SELECT USING (true);

-- Safety Stats (public read)
CREATE POLICY "Anyone can read stats" ON safety_stats FOR SELECT USING (true);

-- Tracking Sessions
CREATE POLICY "Users manage own tracking" ON tracking_sessions FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- SEED: Safety Hotspots (Mumbai Examples)
-- ============================================================================

INSERT INTO safety_hotspots (label, type, lat, lng, radius, description, risk_level, peak_time, verified) VALUES
  ('Dharavi',       'danger',  19.0437, 72.8527, 60, 'Multiple incidents reported. Avoid if possible, especially at night.', 5, 'Night', true),
  ('Kurla Jn.',     'caution', 19.0722, 72.9005, 50, 'Exercise caution. Some reports in this area.', 3, 'Evening', true),
  ('BKC',           'safe',    19.0596, 72.8656, 55, 'Community-marked as safe. Well-lit and patrolled.', 1, 'All Day', true),
  ('Sion',          'caution', 19.0401, 72.8636, 45, 'Exercise caution. Some reports in this area.', 2, 'Late Night', true);

INSERT INTO help_centers (name, category, address, lat, lng, phone) VALUES
  ('BKC Police Station', 'police', 'BKC G Block, Mumbai', 19.0596, 72.8656, '022-12345678'),
  ('Lilavati Hospital', 'hospital', 'Bandra West, Mumbai', 19.0514, 72.8310, '022-87654321');

INSERT INTO safety_stats (title, value, description, source) VALUES
  ('Underreporting', '70%', 'Estimated percentage of harassment cases that go unreported.', 'National Survey'),
  ('Night Safety', '1 in 4', 'Women feel unsafe traveling alone in cities after 10 PM.', 'Urban Safety Study');
