import TelegramBot from 'node-telegram-bot-api';
import { supabase } from './config/supabase.config';
import { env } from './config/env.config';
import { normalizePhone } from './common/utils/phone';

if (!env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is missing!');
  process.exit(1);
}

const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: true });

// Prevent bot errors from crashing the backend
bot.on('error', (err) => {
  console.error('🤖 [BOT ERROR]:', err.message);
});

bot.on('polling_error', (err) => {
  // Common error if multiple instances run (e.g., local + production)
  if (err.message.includes('EFATAL')) {
    console.error('🤖 [BOT POLLING ERROR]: Multiple instances detected or network failed.');
  } else {
    console.warn('🤖 [BOT POLLING ERROR]:', err.message);
  }
});

console.log('🤖 SAHASYA Bot v2 (Universal) is now ONLINE...');

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, `<b>🌸 Welcome to Sahasya!</b>\n\nI am here to ensure SOS alerts reach you instantly. Please click the button below to link your phone number.`, {
    parse_mode: 'HTML',
    reply_markup: {
      keyboard: [[{ text: '📲 Link My Phone Number', request_contact: true }]],
      resize_keyboard: true, one_time_keyboard: true
    }
  });
});

bot.on('contact', async (msg) => {
  const chatId = msg.chat.id;
  const contact = msg.contact;
  if (!contact) return;

  const last10 = normalizePhone(contact.phone_number);
  if (!last10) return;

  console.log(`🔍 Linking Attempt: ${contact.phone_number} -> ${last10} (Chat: ${chatId})`);

  try {
    // 0. ALWAYS SAVE TO PERMANENT VAULT (Global Registry)
    await supabase.from('telegram_links').upsert({
      phone_number: last10,
      telegram_chat_id: chatId.toString(),
      updated_at: new Date()
    }, { onConflict: 'phone_number' });

    // 1. Search for existing matches to provide immediate feedback
    const { data: pFound } = await supabase.from('profiles').select('id, full_name').ilike('phone', `%${last10}%`);
    const { data: cFound } = await supabase.from('emergency_contacts').select('id, name').ilike('phone', `%${last10}%`);

    const pResults = (pFound || []) as any[];
    const cResults = (cFound || []) as any[];
    const allMatches = [...pResults, ...cResults];

    if (allMatches.length > 0) {
      // 2. Focused updates on current records for instant DB consistency
      if (pFound) {
        for (const p of pFound) {
          await supabase.from('profiles').update({ telegram_chat_id: chatId.toString() }).eq('id', p.id);
        }
      }
      if (cFound) {
        for (const c of cFound) {
          await supabase.from('emergency_contacts').update({ telegram_chat_id: chatId.toString() }).eq('id', c.id);
        }
      }

      const match = allMatches[0];
      const name = match.full_name || match.name || 'Sahasya User';

      console.log(`✅ MEGA-LINK SUCCESS: ${name}`);
      await bot.sendMessage(chatId, `<b>🎉 LINKED SUCCESSFULLY!</b>\n\nI found your contact as: <b>${name}</b>.\n\nYou are now ready to receive SOS alerts!`, {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true }
      });
    } else {
      console.log(`📡 PERMANENT LINK SAVED (No immediate match for ...${last10})`);
      await bot.sendMessage(chatId, `<b>✅ PHONE LINKED!</b>\n\nI couldn't find you in any contact lists <i>yet</i>, but I've saved your link. As soon as someone adds you as an emergency contact, I'll be ready!`, {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true }
      });
    }
  } catch (err) {
    console.error('❌ Bot Logic Crash:', err);
  }
});

// 3. Fallback: Handle manual number typing
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.text || msg.text.startsWith('/') || msg.contact) return;

  const last10 = normalizePhone(msg.text);
  if (last10 && last10.length >= 8) {
    console.log(`🔍 Manual Entry Attempt: ${msg.text} -> ${last10} (Chat: ${chatId})`);

    try {
      await supabase.from('telegram_links').upsert({
        phone_number: last10,
        telegram_chat_id: chatId.toString(),
        updated_at: new Date()
      }, { onConflict: 'phone_number' });

      await bot.sendMessage(chatId, `<b>✅ NUMBER REGISTERED!</b>\n\nI've linked your Telegram to <b>...${last10}</b>. If you are an emergency contact for anyone in Sahasya, alerts will arrive here!`, {
        parse_mode: 'HTML'
      });
    } catch (err) {
      console.error('❌ Manual Link Error:', err);
    }
  } else {
    // Unrecognized text (like "hi")
    await bot.sendMessage(chatId, `👋 <b>Hello! I am the Sahasya Emergency Bot.</b>\n\nI send SOS alerts to emergency contacts. To receive alerts, I need to link your Telegram account to your phone number.`, {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [[{ text: '📲 Link Phone Number', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  }
});

// --- 4. Master SOS Monitoring Dashboard ---
console.log('📡 Master SOS Monitor: ACTIVE');
supabase
  .channel('system_monitoring')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_logs' }, (payload) => {
    const { type, message } = payload.new || {};
    if (!type) return;

    if (type === 'SOS_START') {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`🚨🚨🚨 ${message} 🚨🚨🚨`);
      console.log(`${'═'.repeat(60)}`);
    } else if (type === 'SOS_DISPATCH') {
      console.log(`📡 ${message}`);
    } else if (type === 'SOS_END') {
      console.log(`${'─'.repeat(60)}`);
      console.log(`📊 ${message}\n`);
    } else {
      console.log(`📝 [LOG]: ${message}`);
    }
  })
  .subscribe();
