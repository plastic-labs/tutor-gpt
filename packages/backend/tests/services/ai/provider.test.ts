import { describe, it, expect, vi, beforeEach } from 'vitest';

// ------- mocks -------
const mockCreateOpenAI = vi.fn().mockReturnValue('openai-provider');
const mockCreateAnthropic = vi.fn().mockReturnValue('anthropic-provider');
const mockCreateOpenAICompatible = vi.fn().mockReturnValue('compat-provider');

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: mockCreateOpenAI,
}));

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: mockCreateAnthropic,
}));

vi.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: mockCreateOpenAICompatible,
}));

// Mock the `ai` package so the module-level imports of streamText / generateText
// don't fail.
vi.mock('ai', () => ({
  streamText: vi.fn(),
  generateText: vi.fn(),
}));

vi.mock('dedent-js', () => ({ default: (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v) }));

// ------- tests -------
describe('getProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the default provider and model from env when BYOK is not provided', async () => {
    // Import after mocks are set up
    const { getProvider } = await import('../../../src/services/ai/provider.js');

    const result = getProvider();

    // The default provider is constructed at module level via createOpenAICompatible
    // so we just assert the model comes from env.MODEL
    expect(result.model).toBe(process.env.MODEL);
    // The provider should be the one produced by createOpenAICompatible (called at
    // module level with env values).
    expect(result.provider).toBeDefined();
  });

  it('returns the default provider when BYOK is present but disabled', async () => {
    const { getProvider } = await import('../../../src/services/ai/provider.js');

    const result = getProvider({
      enabled: false,
      provider: 'openai',
      apiKey: 'key',
      model: 'gpt-4',
    });

    expect(result.model).toBe(process.env.MODEL);
  });

  it('calls createOpenAI with the provided API key for openai BYOK', async () => {
    const { getProvider } = await import('../../../src/services/ai/provider.js');

    const result = getProvider({
      enabled: true,
      provider: 'openai',
      apiKey: 'sk-user-key',
      model: 'gpt-4o',
    });

    expect(mockCreateOpenAI).toHaveBeenCalledWith({ apiKey: 'sk-user-key' });
    expect(result.provider).toBe('openai-provider');
    expect(result.model).toBe('gpt-4o');
  });

  it('calls createAnthropic with the provided API key for anthropic BYOK', async () => {
    const { getProvider } = await import('../../../src/services/ai/provider.js');

    const result = getProvider({
      enabled: true,
      provider: 'anthropic',
      apiKey: 'sk-ant-key',
      model: 'claude-3-opus',
    });

    expect(mockCreateAnthropic).toHaveBeenCalledWith({ apiKey: 'sk-ant-key' });
    expect(result.provider).toBe('anthropic-provider');
    expect(result.model).toBe('claude-3-opus');
  });

  it('calls createOpenAICompatible with the provided API key and base URL for openrouter BYOK', async () => {
    const { getProvider } = await import('../../../src/services/ai/provider.js');

    const result = getProvider({
      enabled: true,
      provider: 'openrouter',
      apiKey: 'or-key',
      model: 'mistral/mistral-large',
      baseUrl: 'https://custom-openrouter.example.com/v1',
    });

    expect(mockCreateOpenAICompatible).toHaveBeenCalledWith({
      name: 'openrouter',
      apiKey: 'or-key',
      baseURL: 'https://custom-openrouter.example.com/v1',
    });
    expect(result.provider).toBe('compat-provider');
    expect(result.model).toBe('mistral/mistral-large');
  });

  it('uses the default OpenRouter base URL when custom BYOK has no baseUrl', async () => {
    const { getProvider } = await import('../../../src/services/ai/provider.js');

    getProvider({
      enabled: true,
      provider: 'custom',
      apiKey: 'custom-key',
      model: 'custom-model',
      // baseUrl intentionally omitted
    });

    expect(mockCreateOpenAICompatible).toHaveBeenCalledWith({
      name: 'custom',
      apiKey: 'custom-key',
      baseURL: 'https://openrouter.ai/api/v1',
    });
  });
});
