import { env } from '../config/env.config';

async function testTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('❌ TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not found in env');
    return;
  }
  
  console.log('📤 Sending test Telegram message...');
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '<b>✅ SAHASYA SYSTEM CHECK</b>\n\nYour Telegram bot is now fully integrated with the backend. SOS alerts will arrive here!',
        parse_mode: 'HTML'
      })
    });
    
    const data = await response.json();
    if (data.ok) {
      console.log('✨ SUCCESS! Check your Telegram!');
    } else {
      console.error('❌ FAILED:', data.description);
      console.log('Make sure you have clicked START on your bot!');
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

testTelegram();
