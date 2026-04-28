-- Create a table for check-in timers
create table if not exists public.timers (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    expires_at timestamp with time zone not null,
    is_active boolean default true,
    created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.timers enable row level security;

-- Policies
create policy "Users can manage their own timers"
    on public.timers for all
    using (auth.uid() = user_id);

-- Enable Realtime
alter publication supabase_realtime add table timers;
