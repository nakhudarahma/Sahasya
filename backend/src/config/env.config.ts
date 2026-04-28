import * as z from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  JWT_SECRET: z.string().optional().default('dev-secret'),
  VONAGE_API_KEY: z.string().optional().default(''),
  VONAGE_API_SECRET: z.string().optional().default(''),
  VONAGE_FROM: z.string().optional().default('SAHASYA'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
