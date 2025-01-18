import { Message, user, assistant } from '@/utils/ai';
export const namePrompt: Message[] = [
  user`Your task is to create a 5-word or less summary of the conversation topic, starting with an action verb.

  Rules:
  1. Must start with an action verb
  2. Maximum 5 words
  3. Be specific but concise
  4. Focus on the core topic/goal
  
  Does that make sense?`,
  assistant`Yes, it makes sense. Send the first message whenever you're ready.`,
  user`I want to learn about quantum physics and understand the basic principles behind quantum mechanics`,
  assistant`Exploring quantum physics fundamentals`,
  user`Can you help me write a poem about love and loss? I want it to be meaningful and touching`,
  assistant`Crafting emotional love poetry`,
];
