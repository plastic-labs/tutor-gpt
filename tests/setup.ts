import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

if (!process.env.AI_API_KEY) {
  throw new Error('AI_API_KEY must be set in .env.local');
}

// Set OpenRouter API key to use the same key
process.env.OPENROUTER_API_KEY = process.env.AI_API_KEY;

if (!process.env.MODEL) {
  throw new Error('MODEL must be set in .env.local');
}
