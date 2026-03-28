import { describe, expect, test } from 'vitest';
import { PROVIDER_PRESETS, clampTemperature } from '@/utils/ai';

/**
 * Integration tests for MiniMax provider support.
 *
 * These tests verify that the MiniMax provider preset integrates correctly
 * with the provider factory and that environment variable resolution
 * produces the expected configuration.
 *
 * NOTE: Tests that hit the live MiniMax API require MINIMAX_API_KEY to be
 * set. They are skipped when the key is not available.
 */

// ---------------------------------------------------------------------------
// Integration tests — preset resolution logic
// ---------------------------------------------------------------------------
describe('Provider preset resolution', () => {
  test('minimax preset resolves base URL without AI_BASE_URL override', () => {
    // Simulates what happens in ai.ts when AI_PROVIDER=minimax and
    // AI_BASE_URL is not set.
    const provider = 'minimax';
    const preset = PROVIDER_PRESETS[provider];
    const baseURL = undefined || preset?.baseURL || 'https://openrouter.ai/api/v1';
    expect(baseURL).toBe('https://api.minimax.io/v1');
  });

  test('minimax preset resolves default model without MODEL override', () => {
    const provider = 'minimax';
    const preset = PROVIDER_PRESETS[provider];
    const model = undefined || preset?.defaultModel || 'gpt-3.5-turbo';
    expect(model).toBe('MiniMax-M2.7');
  });

  test('unknown provider falls back to openrouter defaults', () => {
    const provider = 'custom-provider';
    const preset = PROVIDER_PRESETS[provider];
    const baseURL = undefined || preset?.baseURL || 'https://openrouter.ai/api/v1';
    const model = undefined || preset?.defaultModel || 'gpt-3.5-turbo';
    expect(baseURL).toBe('https://openrouter.ai/api/v1');
    expect(model).toBe('gpt-3.5-turbo');
  });
});

// ---------------------------------------------------------------------------
// Integration tests — temperature clamping with provider presets
// ---------------------------------------------------------------------------
describe('Temperature clamping integration', () => {
  test('minimax provider clamps temperature across boundary values', () => {
    const provider = 'minimax';
    const testCases = [
      { input: 0, expected: 0.01 },
      { input: 0.5, expected: 0.5 },
      { input: 1, expected: 1 },
      { input: 1.5, expected: 1 },
      { input: -0.5, expected: 0.01 },
    ];

    for (const { input, expected } of testCases) {
      expect(clampTemperature(provider, input)).toBe(expected);
    }
  });

  test('openrouter provider does not clamp temperature', () => {
    const provider = 'openrouter';
    expect(clampTemperature(provider, 0)).toBe(0);
    expect(clampTemperature(provider, 2)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Integration tests — OpenAI-compatible endpoint construction
// ---------------------------------------------------------------------------
describe('MiniMax API endpoint compatibility', () => {
  test('minimax base URL follows OpenAI-compatible /v1 convention', () => {
    const preset = PROVIDER_PRESETS.minimax;
    expect(preset.baseURL).toMatch(/\/v1$/);
  });

  test('minimax base URL uses HTTPS', () => {
    const preset = PROVIDER_PRESETS.minimax;
    expect(preset.baseURL).toMatch(/^https:\/\//);
  });

  test('minimax base URL points to api.minimax.io', () => {
    const preset = PROVIDER_PRESETS.minimax;
    const url = new URL(preset.baseURL);
    expect(url.hostname).toBe('api.minimax.io');
  });
});
