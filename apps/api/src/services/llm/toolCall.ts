import type Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';
import type { AnthropicToolDef } from '@gym-app/shared/llm/toolSchema';
import { getAnthropicClient } from './anthropic.client';

export class LlmRefusalError extends Error {
  constructor(public category: string | null) {
    super('The assistant declined to respond to this request.');
    this.name = 'LlmRefusalError';
  }
}

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface ForcedToolCallOptions<T extends z.ZodTypeAny> {
  model: string;
  system: string;
  messages: Anthropic.MessageParam[];
  tool: AnthropicToolDef;
  schema: T;
  maxTokens?: number;
  effort?: Effort;
}

/**
 * Calls Claude with a single tool forced via tool_choice, so the model's reply IS the
 * structured extraction - no separate free-text turn to reconcile against it. Adaptive
 * thinking is left on (the default); disabling it on Opus-tier models risks tool calls
 * leaking into plain text instead of a tool_use block.
 */
export async function callWithForcedTool<T extends z.ZodTypeAny>(
  opts: ForcedToolCallOptions<T>,
): Promise<z.infer<T>> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 8000,
    system: opts.system,
    messages: opts.messages,
    tools: [opts.tool as unknown as Anthropic.Tool],
    tool_choice: { type: 'tool', name: opts.tool.name },
    output_config: { effort: opts.effort ?? 'medium' },
  });

  if (response.stop_reason === 'refusal') {
    throw new LlmRefusalError(response.stop_details?.category ?? null);
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
  );
  if (!toolUse) {
    throw new Error('Model did not return the expected tool call.');
  }

  return opts.schema.parse(toolUse.input);
}

export interface FreeChatOptions {
  model: string;
  system: string;
  messages: Anthropic.MessageParam[];
  tools?: AnthropicToolDef[];
  maxTokens?: number;
  effort?: Effort;
}

export interface FreeChatResult {
  text: string;
  toolCalls: { name: string; input: unknown }[];
  stopReason: Anthropic.StopReason | null;
}

/** Free-form chat turn (tool_choice: auto) - used for the coach, where Claude may or may
 *  not decide to call a tool and always produces a user-facing text reply. */
export async function callChat(opts: FreeChatOptions): Promise<FreeChatResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    messages: opts.messages,
    tools: opts.tools?.map((t) => t as unknown as Anthropic.Tool),
    output_config: { effort: opts.effort ?? 'medium' },
  });

  if (response.stop_reason === 'refusal') {
    throw new LlmRefusalError(response.stop_details?.category ?? null);
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  const toolCalls = response.content
    .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
    .map((block) => ({ name: block.name, input: block.input }));

  return { text, toolCalls, stopReason: response.stop_reason };
}
