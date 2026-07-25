// ==============================================================================
// Conversation Loop — Reusable Claude tool-use agent service
// ==============================================================================
// Generic conversation loop that works for both Driver and Ops agents.
// Sends system prompt + tool definitions + message history to Claude,
// executes tool calls, feeds results back, loops until Claude returns
// a final text response.

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export type ToolHandler = (
  toolName: string,
  args: Record<string, unknown>,
  context: ConversationContext,
) => Promise<unknown>;

export interface ConversationContext {
  userId: string;
  userRole: string;
  sessionId: string;
}

interface StoredMessage {
  role: 'user' | 'assistant';
  content: Anthropic.MessageParam['content'];
}

interface Session {
  messages: StoredMessage[];
  lastAccessed: number;
}

// ─── Session Store ──────────────────────────────────────────────────────────
// In-memory session store with TTL cleanup.
// For production scale, swap for Redis.

const sessions = new Map<string, Session>();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getSession(sessionId: string): Session {
  let session = sessions.get(sessionId);
  if (!session) {
    session = { messages: [], lastAccessed: Date.now() };
    sessions.set(sessionId, session);
  }
  session.lastAccessed = Date.now();
  return session;
}

// Cleanup stale sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastAccessed > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes

// ─── Claude Client ──────────────────────────────────────────────────────────

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return anthropicClient;
}

// ─── Conversation Loop ─────────────────────────────────────────────────────

const MAX_TOOL_ROUNDS = 10; // Safety limit to prevent infinite loops

/**
 * Run a conversation turn with Claude.
 *
 * 1. Appends the user message to session history
 * 2. Sends system prompt + tools + history to Claude
 * 3. If Claude returns tool_use blocks, executes each tool via the handler
 * 4. Feeds tool results back to Claude
 * 5. Loops until Claude returns a final text response (end_turn)
 * 6. Returns the final text response
 */
export async function runConversationTurn(
  systemPrompt: string,
  tools: ToolDefinition[],
  toolHandler: ToolHandler,
  userMessage: string,
  context: ConversationContext,
): Promise<string> {
  const client = getClient();
  const session = getSession(context.sessionId);

  // Add user message to history
  session.messages.push({ role: 'user', content: userMessage });

  // Build messages for Claude (convert our stored format)
  const messages: Anthropic.MessageParam[] = session.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let round = 0;

  while (round < MAX_TOOL_ROUNDS) {
    round++;

    // Call Claude
    const response = await client.messages.create({
      model: config.claudeModel,
      max_tokens: 4096,
      system: systemPrompt,
      tools: tools as Anthropic.Tool[],
      messages,
    });

    // Check what Claude returned
    const hasToolUse = response.content.some((block) => block.type === 'tool_use');

    if (!hasToolUse || response.stop_reason === 'end_turn') {
      // Final response — extract text blocks
      const textBlocks = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text);

      const finalText = textBlocks.join('\n') || 'I apologize, but I was unable to generate a response.';

      // Store assistant response in history
      session.messages.push({
        role: 'assistant',
        content: response.content as Anthropic.ContentBlock[],
      });

      return finalText;
    }

    // Tool use — execute each tool call
    const assistantContent = response.content as Anthropic.ContentBlock[];

    // Store the assistant's tool_use response
    session.messages.push({ role: 'assistant', content: assistantContent });

    // Build tool results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        try {
          const result = await toolHandler(
            block.name,
            block.input as Record<string, unknown>,
            context,
          );

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: typeof result === 'string' ? result : JSON.stringify(result),
          });
        } catch (err) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Error: ${(err as Error).message}`,
            is_error: true,
          });
        }
      }
    }

    // Add tool results to messages and history
    const toolResultMessage: Anthropic.MessageParam = {
      role: 'user',
      content: toolResults,
    };

    session.messages.push({
      role: 'user',
      content: toolResults,
    });

    messages.push(
      { role: 'assistant', content: assistantContent },
      toolResultMessage,
    );
  }

  // Safety: exceeded max rounds
  return 'I apologize, but I reached the maximum number of tool calls for this request. Please try again with a simpler request.';
}

/**
 * Clear a conversation session.
 */
export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}
