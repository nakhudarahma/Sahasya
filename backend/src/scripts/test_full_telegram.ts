import { supabase } from '../config/supabase.config';
import { TelegramService } from '../common/services/telegram.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testFullPipeline() {
  console.log('🔄 Fetching user from Supabase...');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, telegram_chat_id')
    .ilike('full_name', '%Shubh%')
    .limit(1);

  const profile = data ? data[0] : null;

  if (error || !profile) {
    console.error('❌ Could not find profile in DB. Did you run the SQL?', error);
    return;
  }

  console.log(`👤 Found User: ${profile.full_name}`);
  console.log(`🆔 Telegram ID in DB: ${profile.telegram_chat_id}`);

  if (!profile.telegram_chat_id) {
    console.error('❌ telegram_chat_id is empty in the database!');
    return;
  }

  const testLink = 'https://sahasya-woman-safety.vercel.app/track/test-sos';
  const message = `<b>🚨 SAHASYA SOS ALERT (TEST)</b>\n\n<b>${profile.full_name}</b> is testing the emergency system from <b>Vile Parle</b>.\n\n📍 <a href="${testLink}">Live Tracking Link</a>`;

  console.log('📤 Sending Telegram alert via Bot...');
  await TelegramService.sendMessage(profile.telegram_chat_id, message);
  
  console.log('✨ DONE! Check your Telegram app!');
}

testFullPipeline();
