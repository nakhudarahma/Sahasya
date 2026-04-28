-- Add telegram_chat_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_chat_id text;

-- Add a comment for clarity
COMMENT ON COLUMN public.profiles.telegram_chat_id IS 'Stored Telegram Chat ID for SOS notifications';
