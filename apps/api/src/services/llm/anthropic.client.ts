import Anthropic from '@anthropic-ai/sdk';
import { env, isLlmConfigured } from '../../lib/env';

export class LlmNotConfiguredError extends Error {
  constructor() {
    super('ANTHROPIC_API_KEY is not configured on the server.');
    this.name = 'LlmNotConfiguredError';
  }
}

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!isLlmConfigured) throw new LlmNotConfiguredError();
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

export const CHAT_MODEL = env.ANTHROPIC_CHAT_MODEL;
export const EXTRACTION_MODEL = env.ANTHROPIC_EXTRACTION_MODEL;
