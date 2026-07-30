import { zodToJsonSchema } from 'zod-to-json-schema';
import type { z } from 'zod';

export interface AnthropicToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/**
 * Converts a zod schema into an Anthropic tool definition. Anthropic's `input_schema` wants a
 * flat JSON Schema object without `$ref`/`definitions`, so nested objects are inlined
 * (`$refStrategy: 'none'`) and the top-level `$schema` key is stripped.
 */
export function toAnthropicTool(
  name: string,
  description: string,
  schema: z.ZodTypeAny,
): AnthropicToolDef {
  const jsonSchema = zodToJsonSchema(schema, {
    target: 'openApi3',
    $refStrategy: 'none',
  }) as Record<string, unknown>;
  const { $schema: _$schema, ...inputSchema } = jsonSchema;
  return { name, description, input_schema: inputSchema };
}
