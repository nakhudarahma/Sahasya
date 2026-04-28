-- ============================================================================
-- SAHASYA — Reports Schema Update
-- Run this in the Supabase SQL Editor to fix report submission errors.
-- ============================================================================

-- 1. Ensure columns exist in [reports] table
DO $$ 
BEGIN 
    -- Rename 'anonymous' to 'is_anonymous' if it exists under old name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='anonymous') THEN
        ALTER TABLE public.reports RENAME COLUMN anonymous TO is_anonymous;
    END IF;

    -- Add 'category' if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='category') THEN
        ALTER TABLE public.reports ADD COLUMN category TEXT;
    END IF;

    -- Add 'evidence_id' if missing (points to an entry in the incidents/vault table)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='evidence_id') THEN
        ALTER TABLE public.reports ADD COLUMN evidence_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL;
    END IF;

    -- Add 'status' if missing or update default
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='status') THEN
        ALTER TABLE public.reports ADD COLUMN status TEXT DEFAULT 'PENDING';
    END IF;
END $$;

-- 2. Create [report_timeline] table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.report_timeline (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  time text NOT NULL,
  event text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Update RLS Policies
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_timeline ENABLE ROW LEVEL SECURITY;

-- Reports Policies
DROP POLICY IF EXISTS "Users CRUD own reports" ON public.reports;
DROP POLICY IF EXISTS "Anyone can insert anonymous report" ON public.reports;
CREATE POLICY "Users CRUD own reports" ON public.reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert anonymous report" ON public.reports FOR INSERT WITH CHECK (user_id IS NULL AND is_anonymous = true);

-- Timeline Policies
DROP POLICY IF EXISTS "Users CRUD own report timeline" ON public.report_timeline;
DROP POLICY IF EXISTS "Anyone can insert anonymous timeline" ON public.report_timeline;
CREATE POLICY "Users CRUD own report timeline" ON public.report_timeline FOR ALL USING (
  EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_timeline.report_id AND r.user_id = auth.uid())
);
CREATE POLICY "Anyone can insert anonymous timeline" ON public.report_timeline FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_timeline.report_id AND r.user_id IS NULL AND r.is_anonymous = true)
);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
