import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.config';

async function listModels() {
  console.log('🔍 QUERYING GOOGLE AI FOR AVAILABLE MODELS... 🔍');
  
  if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'your_gemini_api_key') {
    console.error('❌ GEMINI_API_KEY is not set correctly in your .env file!');
    return;
  }

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  
  try {
    // This is the direct API call to see what Google provides you
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    if (data.models) {
      console.log(`✅ FOUND ${data.models.length} MODELS:`);
      data.models.forEach((m: any) => {
        console.log(`   - ${m.name.replace('models/', '')} [${m.supportedGenerationMethods.join(', ')}]`);
      });
    } else {
      console.error('❌ No models found or access denied. Response:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ Failed to connect to Google AI:', err);
  }
}

listModels();
