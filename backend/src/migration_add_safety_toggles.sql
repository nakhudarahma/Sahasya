-- Migration: Add safety toggle columns to the profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS risk_alerts boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sos_notifications boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS save_history boolean DEFAULT true;

-- Update existing records to have these defaults
UPDATE public.profiles SET risk_alerts = true WHERE risk_alerts IS NULL;
UPDATE public.profiles SET sos_notifications = true WHERE sos_notifications IS NULL;
UPDATE public.profiles SET save_history = true WHERE save_history IS NULL;
