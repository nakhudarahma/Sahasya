import { supabase } from '../config/supabase.config';
import { normalizePhone } from '../common/utils/phone';

async function debugSos() {
  console.log('🧪 SOS PIPELINE DIAGNOSTIC 🧪');
  
  // 1. Get the primary user (the one triggering SOS)
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, phone').limit(1);
  const user = profiles?.[0];
  if (!user) return console.log('❌ No user found.');
  
  console.log(`👤 Triggering User: ${user.full_name} (${user.id})`);

  // 2. Get their Emergency Contacts
  const { data: contacts } = await supabase.from('emergency_contacts').select('*').eq('user_id', user.id);
  console.log(`📋 Found ${contacts?.length || 0} Emergency Contacts:`);
  
  for (const c of (contacts || [])) {
    const norm = normalizePhone(c.phone);
    console.log(`   - ${c.name}: "${c.phone}" -> Normalized: ${norm}`);
  }

  // 3. Check all Telegram IDs in system
  const { data: tgProfiles } = await supabase.from('profiles').select('full_name, phone, telegram_chat_id').not('telegram_chat_id', 'is', null);
  console.log(`\n🤖 Telegram Profile Map in DB:`);
  
  const map = new Map();
  for (const p of (tgProfiles || [])) {
    const norm = normalizePhone(p.phone || '');
    console.log(`   - ${p.full_name}: ID=${p.telegram_chat_id} | Phone="${p.phone}" | Normalized=${norm}`);
    if (norm) map.set(norm, p.telegram_chat_id);
  }

  // 3b. Check permanent telegram_links
  const { data: links } = await supabase.from('telegram_links').select('*');
  console.log(`\n🔗 Permanent Telegram Links (telegram_links table):`);
  for (const l of (links || [])) {
    console.log(`   - Phone: ${l.phone_number} -> Chat ID: ${l.telegram_chat_id}`);
    map.set(l.phone_number, l.telegram_chat_id); // Merge with map
  }

  // 4. Try to find a match
  console.log('\n🔍 MATCHING ATTEMPT:');
  for (const c of (contacts || [])) {
    const norm = normalizePhone(c.phone);
    const match = map.get(norm || '');
    if (match) {
      console.log(`   ✅ MATCH FOUND for ${c.name}! Will send to Telegram: ${match}`);
    } else {
      console.log(`   ❌ NO MATCH for ${c.name}.`);
    }
  }
}

debugSos();
