import { supabase } from '../config/supabase.config';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function debugTelegramMapping() {
  console.log('🔍 Debugging Telegram Mapping...');

  // 1. Get all profiles to see phone format
  const { data: profiles } = await supabase
    .from('profiles')
    .select('full_name, phone, telegram_chat_id')
    .limit(10);

  console.log('\n👤 PROFILES TABLE:');
  console.table(profiles?.map(p => ({
    Name: p.full_name,
    Phone: p.phone,
    HasTG: !!p.telegram_chat_id
  })));

  // 2. Get emergency contacts
  const { data: contacts } = await supabase
    .from('emergency_contacts')
    .select('name, phone, user_id')
    .limit(10);

  console.log('\n📞 EMERGENCY_CONTACTS TABLE:');
  console.table(contacts?.map(c => ({
    Name: c.name,
    Phone: c.phone
  })));

  console.log('\n💡 Analysis: Do the Phone strings match exactly? If not, the Telegram lookup will fail.');
}

debugTelegramMapping();
