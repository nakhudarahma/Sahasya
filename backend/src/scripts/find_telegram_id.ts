async function findChatId() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in env');
    return;
  }
  console.log('🔍 Checking for messages to @sahasya_bot...');
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const data = await response.json();
    
    if (data.ok && data.result.length > 0) {
      // Get the last message sender
      const lastUpdate = data.result[data.result.length - 1];
      const chat = lastUpdate.message?.chat || lastUpdate.callback_query?.message?.chat;
      
      if (chat) {
        const chatId = chat.id;
        const name = chat.first_name || 'User';
        
        console.log(`✅ FOUND YOU! Name: ${name} | Chat ID: ${chatId}`);
        
        // Send a confirmation message
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `<b>🎉 CONGRATULATIONS ${name.toUpperCase()}!</b>\n\nYour Chat ID is <code>${chatId}</code>.\n\nSAHASYA is now successfully linked to your Telegram. You will receive SOS alerts here.`,
            parse_mode: 'HTML'
          })
        });
        
        console.log('✨ Confirmation sent to Telegram!');
      }
    } else {
      console.log('⌛ No messages found yet. Did you click START and send a message?');
    }
  } catch (err) {
    console.error('❌ Error checking updates:', err);
  }
}

findChatId();
