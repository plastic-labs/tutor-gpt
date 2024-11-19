'use server';

import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';
import { revalidatePath } from 'next/cache';

const OPENROUTER_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MODEL = process.env.MODEL

async function fetchOpenRouter(messages: any[]) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': "https://chat.bloombot.ai",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages,
      stream: true,
    }),
  });

  return response.body;
}

export async function streamThought(message: string, conversationId: string) {
  const supabase = createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  try {
    const stream = await fetchOpenRouter([
      { role: 'system', content: 'You are an AI assistant that thinks carefully about how to respond.' },
      { role: 'user', content: message }
    ]);

    if (!stream) throw new Error('Failed to get stream');

    return stream;

  } catch (error) {
    console.error('Thought stream error:', error);
    throw error;
  }
}

export async function streamResponse(message: string, conversationId: string, thought: string, honchoContent: string) {
  const supabase = createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  try {
    const stream = await fetchOpenRouter([
      { role: 'system', content: 'You are a helpful AI assistant.' },
      { role: 'user', content: `Thought: ${thought}\nHoncho Content: ${honchoContent}\nUser Message: ${message}` }
    ]);

    if (!stream) throw new Error('Failed to get stream');

    // Store user message
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        content: message,
        role: 'user'
      });

    if (messageError) throw messageError;

    revalidatePath('/');
    return stream;

  } catch (error) {
    console.error('Response stream error:', error);
    throw error;
  }
}