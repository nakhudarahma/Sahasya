import { supabase } from '../config/supabase.config';

async function inspectContacts() {
  console.log('🔍 INSPECTING EMERGENCY CONTACTS 🔍');
  
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('name, phone, telegram_chat_id');

  if (error) {
    console.error('❌ Error reading database:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ No contacts found in the database. Did you add them in the app?');
    return;
  }

  console.log(`📋 Found ${data.length} contacts:`);
  data.forEach(c => {
    console.log(`   - NAME: "${c.name}" | PHONE: "${c.phone}" | TG_ID: "${c.telegram_chat_id || 'EMPTY'}"`);
    // Check for "invisible" characters or spaces
    if (c.phone !== c.phone.trim()) console.log('     ⚠️ Warning: Phone has leading/trailing spaces!');
    if (c.phone.includes(' ')) console.log('     ⚠️ Warning: Phone contains internal spaces!');
  });
}

inspectContacts();
