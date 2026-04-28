-- Migration: Add missing onboarding and profile fields to the profiles table
-- Run this in your Supabase SQL Editor

-- 1. Rename 'name' to 'full_name' if it exists and 'full_name' doesn't
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='name') AND 
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='full_name') THEN
    ALTER TABLE public.profiles RENAME COLUMN name TO full_name;
  END IF;
END $$;

-- 2. Add 'full_name' if neither 'name' nor 'full_name' exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;

-- 3. Add other missing columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS initials text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS personal_info jsonb DEFAULT '{}'::jsonb;

-- 4. Clean up any columns that might be causing confusion (optional)
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS email; -- Auth handles this in auth.users

-- 5. Set existing users to false for onboarding if they are null
UPDATE public.profiles SET onboarding_completed = false WHERE onboarding_completed IS NULL;
UPDATE public.profiles SET personal_info = '{}'::jsonb WHERE personal_info IS NULL;
