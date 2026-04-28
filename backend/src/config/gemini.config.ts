import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env.config';

let geminiClient: GoogleGenerativeAI | null = null;

if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'your_gemini_api_key') {
  geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  console.log('✅ Gemini AI client initialized (Official SDK)');
} else {
  console.warn('⚠️ GEMINI_API_KEY is not set. AI features will return placeholders.');
}

export const gemini = geminiClient;
