export type BYOKProvider = 'openai' | 'anthropic' | 'openrouter' | 'custom';

export interface BYOKConfig {
  enabled: boolean;
  provider: BYOKProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}
