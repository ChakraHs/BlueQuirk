// Default, backend-free support provider.
//
// It returns localized canned answers for known topics and a friendly fallback
// otherwise, with a short simulated delay so the typing indicator is visible.
// Replace this with a real provider (Claude/OpenAI/live agent/custom backend)
// by implementing the same `SupportProvider` interface — see ./types.ts.

import type { SupportProvider } from "./types";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createEchoProvider(
  answers: Record<string, string>,
  fallback: string
): SupportProvider {
  return {
    id: "echo",
    async send({ text, topic, signal }) {
      // Simulate network / model latency so the typing indicator shows.
      await wait(550 + Math.random() * 500);
      if (signal?.aborted) return "";

      if (topic && answers[topic]) return answers[topic];

      // Naive keyword match against topic ids as a stand-in for real routing.
      const needle = text.toLowerCase();
      const hit = Object.keys(answers).find((k) => needle.includes(k));
      return hit ? answers[hit] : fallback;
    },
  };
}
