import { Message, user, assistant } from '@/utils/ai';
export const namePrompt: Message[] = [
  user`Your task is to create a 5-word or less summary of the conversation topic, starting with an action verb. If the conversation hasn't specified a topic yet, please respond with "NA" and nothing else.

  Rules:
  1. Must start with an action verb
  2. Maximum 5 words
  3. Be specific but concise
  4. Focus on the core topic/goal
  5. DO NOT RESPOND TO THE USER'S MESSAGE, YOU MUST JUST SUMMARIZE IT.

  For example:
  User: I want to learn about quantum physics and understand the basic principles behind quantum mechanics
  Assistant: Exploring quantum physics fundamentals

  User: Can you help me write a poem about love and loss? I want it to be meaningful and touching
  Assistant: Crafting emotional love poetry

  User: Hey there!
  Assistant: NA

  User: I want to learn about stuff
  Assistant: NA
  
  Do you understand?`,
  assistant`Yes, I understand, send the first message whenever you're ready.`,
];
