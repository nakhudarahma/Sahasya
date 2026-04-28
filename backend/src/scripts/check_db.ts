import { supabase } from '../config/supabase.config';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkTelegramIDs() {
  console.log('🔍 Checking Database Profiles for Telegram IDs...');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, telegram_chat_id');

  if (error) {
    console.error('❌ Database Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ No profiles found in the database.');
    return;
  }

  console.log('\n📊 User Profiles Found:');
  data.forEach(user => {
    console.log(`👤 Name: ${user.full_name.padEnd(20)} | Telegram ID: ${user.telegram_chat_id || '❌ NOT SET'}`);
  });

  console.log('\n💡 Tip: If your ID is NOT SET, we need to run the SQL fix again or update it via the script.');
}

checkTelegramIDs();
