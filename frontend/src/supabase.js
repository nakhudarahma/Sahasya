import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tkvjgiragadbvndubbkb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrdmpnaXJhZ2FkYnZuZHViYmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMzE3MTUsImV4cCI6MjA5MTgwNzcxNX0.F-tzpw20aYLpBD0wB4uYmJF35zCnD4_lReNtvfOgp-M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
