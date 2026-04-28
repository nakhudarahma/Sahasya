import { supabase } from '../config/supabase.config';
import { normalizePhone } from '../common/utils/phone';

async function diagnoseLinking() {
  console.log('🧪 LINKING DIAGNOSTIC 🧪');

  // 1. Get a user profile
  const { data: profiles } = await supabase.from('profiles').select('id, full_name').limit(5);
  if (!profiles || profiles.length === 0) return console.log('❌ No profiles found.');

  for (const profile of profiles) {
    console.log(`\n👤 User: ${profile.full_name} (${profile.id})`);

    // 2. Get emergency contacts for this user
    const { data: contacts } = await supabase.from('emergency_contacts').select('id, name, phone, telegram_chat_id').eq('user_id', profile.id);
    console.log(`📋 Contacts (${contacts?.length || 0}):`);
    
    for (const c of (contacts || [])) {
      const norm = normalizePhone(c.phone);
      console.log(`   - ${c.name}: "${c.phone}" | Normalized: ${norm} | DB Chat ID: ${c.telegram_chat_id}`);
    }
  }

  // 3. Inspect telegram_links
  const { data: links } = await supabase.from('telegram_links').select('*');
  console.log(`\n🔗 Permanent Telegram Links (${links?.length || 0}):`);
  for (const l of (links || [])) {
    console.log(`   - Phone: ${l.phone_number} -> Chat ID: ${l.telegram_chat_id}`);
  }

  // 4. Test enrichment logic
  console.log('\n🔍 TEST ENRICHMENT:');
  const { data: allContacts } = await supabase.from('emergency_contacts').select('name, phone, telegram_chat_id');
  const linkMap = new Map();
  (links || []).forEach(l => linkMap.set(l.phone_number, l.telegram_chat_id));

  for (const c of (allContacts || [])) {
    const norm = normalizePhone(c.phone);
    const enrichedChatId = c.telegram_chat_id || linkMap.get(norm) || null;
    console.log(`   - ${c.name}: ${enrichedChatId ? '✅ LINKED' : '❌ NOT LINKED'} (${enrichedChatId || 'null'})`);
  }
}

diagnoseLinking();
