-- 1. Enable Realtime for key tables
-- This allows Supabase to "broadcast" changes to the frontend
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table incidents;
alter publication supabase_realtime add table tracking_sessions;

-- 2. Ensure RLS is active (Safety check)
alter table profiles enable row level security;
alter table incidents enable row level security;
alter table tracking_sessions enable row level security;

-- 3. Optimization: Ensure we only broadcast to authorized users
-- Supabase handles this automatically via RLS policies we already set up.
