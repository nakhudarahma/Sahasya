import { supabase } from '../config/supabase.config';
import { normalizePhone } from '../common/utils/phone';

async function seedTelegramLinks() {
  console.log('🌱 RECOVERING TELEGRAM LINKS 🌱');

  // 1. Get links from Profiles
  const { data: profiles } = await supabase.from('profiles').select('phone, telegram_chat_id').not('telegram_chat_id', 'is', null);
  
  // 2. Get links from Emergency Contacts
  const { data: contacts } = await supabase.from('emergency_contacts').select('phone, telegram_chat_id').not('telegram_chat_id', 'is', null);

  const allRecords = [...(profiles || []), ...(contacts || [])];
  console.log(`🔍 Found ${allRecords.length} potential links to recover...`);

  const linksToUpsert = [];
  const processedPhones = new Set();

  for (const rec of allRecords) {
    const last10 = normalizePhone(rec.phone);
    if (last10 && rec.telegram_chat_id && !processedPhones.has(last10)) {
      linksToUpsert.push({
        phone_number: last10,
        telegram_chat_id: rec.telegram_chat_id,
        updated_at: new Date()
      });
      processedPhones.add(last10);
    }
  }

  if (linksToUpsert.length > 0) {
    console.log(`🚀 Upserting ${linksToUpsert.length} links into telegram_links...`);
    const { error } = await supabase.from('telegram_links').upsert(linksToUpsert, { onConflict: 'phone_number' });
    if (error) console.error('❌ Upsert Error:', error);
    else console.log('✅ Links recovered successfully!');
  } else {
    console.log('⌛ No valid links found to recover.');
  }
}

seedTelegramLinks();
