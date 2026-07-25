// ==============================================================================
// Conversation Loop — Reusable Gemini tool-use agent service
// ==============================================================================

import { GoogleGenAI, Content, Part } from '@google/genai';
import { config } from '../config.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: any; // We'll pass the JSON schema directly as it matches OpenAPI
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
  history: Content[];
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

// ─── Gemini Client ──────────────────────────────────────────────────────────

let geminiClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return geminiClient;
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

  // Format tools for Gemini (OpenAPI schema is generally compatible)
  const formattedTools = [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      })),
    },
  ];

  // Initialize a chat session using our stored history
  const chat = ai.chats.create({
    model: config.geminiModel as string,
    config: {
      systemInstruction: systemPrompt,
      tools: formattedTools,
      temperature: 0,
    },
    // We clone the history so the chat object doesn't mutate our reference
    // in ways we don't control, though it usually just appends.
    history: [...session.history],
  });

  let round = 0;
  let response = await chat.sendMessage({ message: userMessage });

  while (round < MAX_TOOL_ROUNDS) {
    round++;

    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionResponses: Part[] = [];

      for (const call of response.functionCalls) {
        try {
          const result = await toolHandler(
            call.name as string,
            call.args as Record<string, unknown>,
            context,
          );
          
          functionResponses.push({
            functionResponse: {
              name: call.name as string,
              response: { result },
            },
          });
        } catch (err) {
          functionResponses.push({
            functionResponse: {
              name: call.name as string,
              response: { error: (err as Error).message },
            },
          });
        }
      }

      // Send the function responses back to Gemini
      response = await chat.sendMessage({ message: functionResponses });
    } else {
      // No more function calls, we have a text response
      
      // Save the updated history back to our session store
      // The chat object automatically manages the history array.
      session.history = chat.getHistory();
      
      return response.text || 'I apologize, but I was unable to generate a response.';
    }
  }

  // Save history even on abort
  session.history = await chat.getHistory();
  return 'I apologize, but I reached the maximum number of tool calls for this request. Please try again with a simpler request.';
}

export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}
