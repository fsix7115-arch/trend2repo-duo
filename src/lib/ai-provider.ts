import { openai } from '@ai-sdk/openai';

/**
 * Provider selection happens at runtime, not build time, so the app builds and
 * boots with no API keys present. Priority: Anthropic (if wired) -> OpenAI ->
 * none (agents fall back to deterministic local synthesis).
 */
export type ProviderName = 'openai' | 'anthropic' | 'none';

export interface ResolvedProvider {
  name: ProviderName;
  model: string;
  apiKey?: string;
}

export function resolveProvider(): ResolvedProvider {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    return {
      name: 'openai',
      model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o',
      apiKey: openaiKey
    };
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) {
    return {
      name: 'anthropic',
      model: process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-sonnet-latest',
      apiKey: anthropicKey
    };
  }

  return { name: 'none', model: 'heuristic-fallback' };
}

export function hasLiveProvider(): boolean {
  return resolveProvider().name !== 'none';
}

export function getOpenAIModel() {
  const provider = resolveProvider();
  if (provider.name !== 'openai') {
    throw new Error('No OpenAI API key configured');
  }
  return openai(provider.model);
}
