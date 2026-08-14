import { getMangrokAgentRuntime } from "./agent-runtime.js";

export async function prepareCulinaryAgent({ input = {}, simulation = null, query = "" } = {}) {
  const runtime = getMangrokAgentRuntime();
  return runtime.prepare({ query: query || input.notes || input.goal || (input.ingredients || []).join(" "), input, simulation });
}

export function mergeAgentMessages(messages, prepared) {
  if (!prepared?.context) return messages;
  const context = prepared.context;
  const system = `${messages?.[0]?.content || ""}\n\n${prepared.systemPrompt}`.slice(0, 18000);
  const userPayload = {
    ...(safeJson(messages?.[1]?.content) || { request: messages?.[1]?.content || "" }),
    mangrokAgentContext: {
      intent: context.intent,
      selectedSkills: context.skills,
      toolResults: context.toolRuns.map(run => ({ tool: run.tool, ok: run.ok, output: run.ok ? run.output : undefined, error: run.ok ? undefined : run.error })),
      confirmedMemories: context.memories,
      relevantSessionSummaries: context.sessions,
      memoryEnabled: context.memoryEnabled
    }
  };
  return [{ role: "system", content: system }, { role: "user", content: JSON.stringify(userPayload) }];
}

export function attachAgentTrace(result, prepared) {
  if (!prepared?.trace || !result || typeof result !== "object") return result;
  return Object.freeze({ ...result, agentTrace: prepared.trace });
}

function safeJson(value) { try { return JSON.parse(String(value || "")); } catch { return null; } }
