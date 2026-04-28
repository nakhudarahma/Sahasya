import { Vonage } from '@vonage/server-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const apiKey = process.env.VONAGE_API_KEY;
const apiSecret = process.env.VONAGE_API_SECRET;
const from = process.env.VONAGE_FROM || 'SAHASYA';

async function testSMS() {
  if (!apiKey || !apiSecret) {
    console.error('❌ Vonage credentials missing in .env');
    return;
  }

  const vonage = new Vonage({
    apiKey: apiKey,
    apiSecret: apiSecret
  });

  const to = '919326262572'; // The number from your logs
  const text = 'SAHASYA: This is a test SMS to verify the service is working correctly. Stay safe!';

  console.log(`📤 Sending test SMS to ${to}...`);

  try {
    const response = await (vonage.sms as any).send({ to, from, text });
    
    if (response.messages[0].status === '0') {
      console.log('✅ SMS sent successfully!');
      console.log('Message ID:', response.messages[0].messageId);
    } else {
      console.error('❌ SMS failed with status:', response.messages[0].status);
      console.error('Error text:', response.messages[0].errorText);
    }
  } catch (err) {
    console.error('❌ System error while sending SMS:', err);
  }
}

testSMS();
