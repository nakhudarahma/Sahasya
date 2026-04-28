-- SAHASYA Platform - Advanced Supabase Schema & RLS Policies

-- 1. PROFILES & EMERGENCY CONTACTS
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  initials text,
  phone text,
  onboarding_completed boolean DEFAULT false,
  personal_info jsonb DEFAULT '{}'::jsonb,
  vault_hash text,
  avatar_url text,
  blood_group text,
  medical_conditions text,
  telegram_chat_id text,
  share_on_sos boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  relation text,
  phone text NOT NULL,
  telegram_chat_id text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. INCIDENTS & TIMELINE
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  location text NOT NULL,
  duration_seconds integer DEFAULT 0,
  summary text,
  notes text,
  media_count integer DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.incident_timeline (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE CASCADE NOT NULL,
  time text NOT NULL,
  event text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. EVIDENCE FILES (NEW)
CREATE TABLE IF NOT EXISTS public.evidence_files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  media_url text,
  media_type text NOT NULL,
  file_size bigint,
  lat numeric,
  lng numeric,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 4. REPORTS
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  evidence_id uuid REFERENCES public.evidence_files(id) ON DELETE SET NULL,
  type text NOT NULL,
  category text,
  location text NOT NULL,
  description text,
  escalation text DEFAULT 'store',
  is_anonymous boolean DEFAULT true,
  status text DEFAULT 'Reviewing',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Report Timeline table
CREATE TABLE IF NOT EXISTS public.report_timeline (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  time text NOT NULL,
  event text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 5. SAFETY HOTSPOTS
CREATE TABLE IF NOT EXISTS public.safety_hotspots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reported_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  label text NOT NULL,
  type text NOT NULL, -- danger | caution | safe
  category text,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  radius integer DEFAULT 50,
  description text,
  incident_count integer DEFAULT 0,
  peak_time text,
  risk_level integer DEFAULT 1,
  upvotes integer DEFAULT 0,
  verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 6. HELP CENTERS & STATS
CREATE TABLE IF NOT EXISTS public.help_centers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  address text,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  phone text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.safety_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  value text NOT NULL,
  description text,
  category text,
  source text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 7. TRACKING SESSIONS
CREATE TABLE IF NOT EXISTS public.tracking_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  destination text NOT NULL,
  share_link text,
  is_active boolean DEFAULT true,
  ended_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 8. TELEGRAM LINKS (PERMANENT)
CREATE TABLE IF NOT EXISTS public.telegram_links (
  phone_number text PRIMARY KEY, -- Normalized last 10 digits
  telegram_chat_id text NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_hotspots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Emergency Contacts: Own CRUD
CREATE POLICY "Users CRUD own contacts" ON public.emergency_contacts FOR ALL USING (auth.uid() = user_id);

-- Incidents: Own CRUD
CREATE POLICY "Users CRUD own incidents" ON public.incidents FOR ALL USING (auth.uid() = user_id);

-- Incident Timeline: Own CRUD (via incident FK)
CREATE POLICY "Users CRUD own incident timeline" ON public.incident_timeline FOR ALL USING (
  EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_timeline.incident_id AND i.user_id = auth.uid())
);

-- Evidence Files: Own CRUD
CREATE POLICY "Users CRUD own evidence files" ON public.evidence_files FOR ALL USING (auth.uid() = user_id);

-- Reports: Users CRUD own, plus allow insert for anonymous
CREATE POLICY "Users CRUD own reports" ON public.reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert anonymous report" ON public.reports FOR INSERT WITH CHECK (user_id IS NULL AND anonymous = true);

-- Report Timeline: Same setup
CREATE POLICY "Users CRUD own report timeline" ON public.report_timeline FOR ALL USING (
  EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_timeline.report_id AND r.user_id = auth.uid())
);
CREATE POLICY "Anyone can insert anonymous timeline" ON public.report_timeline FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_timeline.report_id AND r.user_id IS NULL AND r.anonymous = true)
);

-- Hotspots: Read for all, Insert for authenticated
CREATE POLICY "Public can view hotspots" ON public.safety_hotspots FOR SELECT USING (true);
CREATE POLICY "Auth users can report hotspots" ON public.safety_hotspots FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users can upvote hotspots" ON public.safety_hotspots FOR UPDATE USING (auth.role() = 'authenticated');

-- Help Centers & Stats: Public read-only
CREATE POLICY "Public can view help centers" ON public.help_centers FOR SELECT USING (true);
CREATE POLICY "Public can view safety stats" ON public.safety_stats FOR SELECT USING (true);

-- Tracking Sessions: Own CRUD
CREATE POLICY "Users CRUD own tracking sessions" ON public.tracking_sessions FOR ALL USING (auth.uid() = user_id);

-- Storage Bucket (Evidence)
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', false) ON CONFLICT DO NOTHING;

-- Storage Policies
-- 1. Auth users can upload to their own folder: evidence/{user_id}/...
-- 2. Auth users can read their own folder
CREATE POLICY "Users can upload own evidence" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can read own evidence" ON storage.objects FOR SELECT USING (
  bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can update own evidence" ON storage.objects FOR UPDATE USING (
  bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can delete own evidence" ON storage.objects FOR DELETE USING (
  bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Telegram Links: Publicly readable for the bot service
CREATE POLICY "Public read Telegram links" ON public.telegram_links FOR SELECT USING (true);
