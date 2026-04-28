import { env } from '../../config/env.config';

interface TelegramResult {
  success: boolean;
  detail: string;
}

export class TelegramService {
  private static baseUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

  /**
   * Send a message to a specific chat ID.
   * Returns { success, detail } so the caller knows ACTUAL delivery status.
   */
  static async sendMessage(chatId: string | number, text: string): Promise<TelegramResult> {
    if (!env.TELEGRAM_BOT_TOKEN) {
      console.warn('⚠️ Telegram Bot Token not set. Skipping Telegram notification.');
      return { success: false, detail: 'Bot token not configured' };
    }

    if (!chatId) {
      return { success: false, detail: 'No chat_id provided' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        console.log(`✅ Telegram delivered to ${chatId} | msg_id: ${data.result?.message_id}`);
        return { success: true, detail: `Delivered (msg_id: ${data.result?.message_id})` };
      }

      // Telegram returned an error — categorize it
      const errCode = data.error_code || 0;
      const errDesc = data.description || 'Unknown Telegram error';
      console.error(`❌ Telegram API Error for ${chatId} | Code: ${errCode} | ${errDesc}`);

      if (errCode === 403) {
        return { success: false, detail: `Bot blocked by user or user never started the bot. (${errDesc})` };
      }
      if (errCode === 400 && errDesc.includes('chat not found')) {
        return { success: false, detail: `Chat not found — user has not started the bot yet. (${errDesc})` };
      }
      if (errCode === 429) {
        return { success: false, detail: `Rate limited by Telegram. Retry later. (${errDesc})` };
      }

      return { success: false, detail: `Telegram error ${errCode}: ${errDesc}` };
    } catch (err: any) {
      console.error(`❌ Telegram network error for ${chatId}:`, err.message);
      return { success: false, detail: `Network error: ${err.message}` };
    }
  }
}
