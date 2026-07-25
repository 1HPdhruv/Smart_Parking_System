// ==============================================================================
// Conversation Loop — Reusable Groq tool-use agent service
// ==============================================================================

import Groq from 'groq-sdk';
import { config } from '../config.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: any;
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

interface Session {
  history: Array<Groq.Chat.Completions.ChatCompletionMessageParam>;
  lastAccessed: number;
}

// ─── Session Store ──────────────────────────────────────────────────────────

const sessions = new Map<string, Session>();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getSession(sessionId: string): Session {
  let session = sessions.get(sessionId);
  if (!session) {
    session = { history: [], lastAccessed: Date.now() };
    sessions.set(sessionId, session);
  }
  session.lastAccessed = Date.now();
  return session;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastAccessed > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

// ─── Groq Client ──────────────────────────────────────────────────────────

let groqClient: Groq | null = null;

function getClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: config.groqApiKey });
  }
  return groqClient;
}

// ─── Conversation Loop ─────────────────────────────────────────────────────

const MAX_TOOL_ROUNDS = 10;

export async function runConversationTurn(
  systemPrompt: string,
  tools: ToolDefinition[],
  toolHandler: ToolHandler,
  userMessage: string,
  context: ConversationContext,
): Promise<string> {
  const ai = getClient();
  const session = getSession(context.sessionId);

  // Format tools for Groq (OpenAI format)
  const formattedTools: Groq.Chat.Completions.ChatCompletionTool[] = tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));

  // Ensure system prompt is the first message
  if (session.history.length === 0 || session.history[0].role !== 'system') {
    session.history = [{ role: 'system', content: systemPrompt }, ...session.history];
  }

  // Add the new user message
  session.history.push({ role: 'user', content: userMessage });

  let round = 0;
  let finalResponse = '';

  while (round < MAX_TOOL_ROUNDS) {
    round++;

    const response = await ai.chat.completions.create({
      model: config.groqModel as string,
      messages: session.history,
      tools: formattedTools,
      tool_choice: 'auto',
      temperature: 0,
    });

    const message = response.choices[0].message;
    session.history.push(message);

    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const call of message.tool_calls) {
        if (call.type !== 'function') continue;
        
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments);
        } catch (e) {
          // ignore parsing error, pass empty
        }

        try {
          const result = await toolHandler(call.function.name, args, context);
          session.history.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        } catch (err) {
          session.history.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify({ error: (err as Error).message }),
          });
        }
      }
    } else {
      // No more function calls, we have a text response
      finalResponse = message.content || 'I apologize, but I was unable to generate a response.';
      break;
    }
  }

  if (round >= MAX_TOOL_ROUNDS) {
    finalResponse = 'I apologize, but I reached the maximum number of tool calls for this request. Please try again with a simpler request.';
  }

  return finalResponse;
}

export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}
