import type { FastifyReply } from 'fastify';
import { LlmNotConfiguredError } from '../services/llm/anthropic.client';
import { LlmRefusalError } from '../services/llm/toolCall';

/** Handles the LLM error types callers should recover from gracefully; returns true if it
 *  sent a response. Anything else should be rethrown so Fastify's error handler logs it. */
export function sendLlmError(err: unknown, reply: FastifyReply): boolean {
  if (err instanceof LlmNotConfiguredError) {
    reply.code(503).send({ error: 'The AI coach is not configured on this server yet.' });
    return true;
  }
  if (err instanceof LlmRefusalError) {
    reply.code(422).send({ error: 'The assistant could not respond to that. Try rephrasing your message.' });
    return true;
  }
  return false;
}
