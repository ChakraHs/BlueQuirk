// Shared types for the floating customer-support widget.
//
// The widget UI is deliberately decoupled from *how* replies are produced: it
// talks to a `SupportProvider`. Swapping the provider is the single seam needed
// to later connect OpenAI, Claude, WhatsApp Business, Messenger, a live agent,
// or a custom backend — no UI changes required.

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** epoch ms — used for timestamps */
  createdAt: number;
  /** true while an assistant reply is being produced (future streaming) */
  pending?: boolean;
}

export interface SupportContext {
  lang: string;
}

export interface SupportSendInput {
  /** the user's latest message */
  text: string;
  /** optional intent id when the message came from a quick action / suggestion */
  topic?: string;
  /** full conversation so far (for context-aware providers) */
  history: ChatMessage[];
  /** abort in-flight requests when the panel closes */
  signal?: AbortSignal;
}

/**
 * The one interface future integrations implement.
 *
 * A real implementation might POST to `/api/support/chat` (custom backend),
 * call the Anthropic/OpenAI SDK, or hand off to a live agent. The UI only ever
 * awaits `send()` and renders the returned string.
 */
export interface SupportProvider {
  id: string;
  send(input: SupportSendInput, ctx: SupportContext): Promise<string>;
}

export interface QuickAction {
  id: string;
  emoji: string;
  label: string;
  /** canned-answer topic id resolved by the provider */
  topic: string;
}

export interface SuggestedQuestion {
  id: string;
  label: string;
  topic: string;
}

/** Max characters accepted by the composer. */
export const MAX_MESSAGE_LENGTH = 1000;
