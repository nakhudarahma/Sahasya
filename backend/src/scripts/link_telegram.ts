import { supabase } from '../config/supabase.config';
import { env } from '../config/env.config';

async function fixTelegramAndPhone() {
  const token = env.TELEGRAM_BOT_TOKEN;
  console.log('🔍 Syncing Telegram Bot with Sahasya Profiles...');

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const data = await response.json();
    
    if (data.ok && data.result.length > 0) {
      const lastUpdate = data.result[data.result.length - 1];
      const chat = lastUpdate.message?.chat || lastUpdate.callback_query?.message?.chat;
      
      if (chat) {
        const chatId = chat.id.toString();
        const firstName = chat.first_name || 'User';

        console.log(`✅ Found Telegram User: ${firstName} (ID: ${chatId})`);

        // 1. Find the user profile (search by name as a fallback)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .ilike('full_name', `%${firstName}%`)
          .limit(1)
          .single();

        if (!profile) {
          console.error('❌ Could not find a profile matching your Telegram name. Please make sure your name in the app matches your Telegram name!');
          return;
        }

        console.log(`👤 Found Matching Sahasya Profile: ${profile.full_name}`);

        // 2. FORCE UPDATE the Telegram ID into the database
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ telegram_chat_id: chatId })
          .eq('id', profile.id);

        if (updateError) {
          console.error('❌ Database update failed:', updateError.message);
        } else {
          console.log(`🎉 SUCCESS! Telegram linked to profile.`);
          
          // 3. Send a confirmation message via bot
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `<b>🚨 TELEGRAM LINKED!</b>\n\nHello ${profile.full_name}, Sahasya is now fully synced. If you are an emergency contact for anyone, you will receive their SOS alerts here!`,
              parse_mode: 'HTML'
            })
          });
        }
      }
    } else {
      console.log('⌛ No messages found. Go to the bot, click START, and send a hello!');
    }
  } catch (err) {
    console.error('❌ Connection error:', err);
  }
}

fixTelegramAndPhone();
