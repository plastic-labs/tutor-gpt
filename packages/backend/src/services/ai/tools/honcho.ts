import { tool } from 'ai';
import { z } from 'zod';
import { getHonchoPeer } from '../../honcho/client.js';

export function honchoDialecticTool(supabaseUserId: string, conversationId: string) {
  return tool({
    description:
      'Query for psychological insights about the student - their learning style, preferences, emotional state, or background. Use when you need to personalize your tutoring approach.',
    parameters: z.object({
      query: z.string().describe('Question about the student'),
    }),
    execute: async ({ query }) => {
      try {
        const peer = await getHonchoPeer(supabaseUserId);
        const content = await peer.chat(query, { session: conversationId });
        return content ?? 'No insights available yet.';
      } catch (error) {
        console.error('Honcho dialectic tool error:', error);
        return 'No insights available yet.';
      }
    },
  });
}
