import { z } from 'zod';

// ---- Request Schemas ----

export const sendMessageSchema = z.object({
  message: z.string().min(1).max(32000),
  conversationId: z.string().uuid(),
});

export const createConversationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export const updateConversationSchema = z.object({
  name: z.string().min(1).max(200),
});

export const reactionSchema = z.object({
  reaction: z.enum(['thumbUp', 'thumbDown']).nullable(),
});

export const nameConversationSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().uuid(),
});

export const createArtifactSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  contentType: z
    .enum(['text/markdown', 'text/plain', 'application/json'])
    .default('text/markdown'),
});

export const updateArtifactSchema = z.object({
  content: z.string().min(1),
  changeSummary: z.string().max(500).optional(),
});

export const byokConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(['openai', 'anthropic', 'openrouter', 'custom']),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  baseUrl: z.string().url().optional(),
});

// ---- Response Schemas ----

export const conversationResponseSchema = z.object({
  name: z.string(),
  conversationId: z.string(),
});

export const messageResponseSchema = z.object({
  id: z.string(),
  content: z.string(),
  isUser: z.boolean(),
  metadata: z.record(z.unknown()),
  createdAt: z.string().optional(),
});

export const subscriptionResponseSchema = z.object({
  status: z
    .enum([
      'trialing',
      'active',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'past_due',
      'unpaid',
      'paused',
    ])
    .nullable(),
  canChat: z.boolean(),
  freeMessages: z.number().optional(),
});

export const artifactResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  contentType: z.string(),
  currentVersion: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ---- Inferred Types ----

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type ReactionInput = z.infer<typeof reactionSchema>;
export type CreateArtifactInput = z.infer<typeof createArtifactSchema>;
export type UpdateArtifactInput = z.infer<typeof updateArtifactSchema>;
export type BYOKConfigInput = z.infer<typeof byokConfigSchema>;
export type ConversationResponse = z.infer<typeof conversationResponseSchema>;
export type MessageResponse = z.infer<typeof messageResponseSchema>;
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;
export type ArtifactResponse = z.infer<typeof artifactResponseSchema>;
