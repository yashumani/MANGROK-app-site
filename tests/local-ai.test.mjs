import test from "node:test";
import assert from "node:assert/strict";
import { extractCompletionText, probeOpenAICompatible, resolveOpenAIEndpoints, sanitizeEndpoint } from "../src/local-ai.js";

test("OpenAI-compatible endpoints are normalized safely", () => {
  const endpoints = resolveOpenAIEndpoints("http://user:password@localhost:11434/v1?token=hidden");
  assert.equal(endpoints.chat, "http://localhost:11434/v1/chat/completions");
  assert.equal(endpoints.models, "http://localhost:11434/v1/models");
  assert.equal(sanitizeEndpoint("http://user:password@localhost:11434/v1?token=hidden"), "http://localhost:11434/v1");
});

test("model probes support OpenAI and Ollama-shaped responses", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ data: [{ id: "mangrok-alchemy" }] }), { status: 200 });
  const result = await probeOpenAICompatible({ baseUrl: "http://localhost:11434/v1", fetchImpl });
  assert.equal(result.ok, true);
  assert.deepEqual(result.models, ["mangrok-alchemy"]);
});

test("completion extraction handles gateway wrappers", () => {
  assert.equal(extractCompletionText({ completion: { choices: [{ message: { content: "{\"title\":\"Dish\"}" } }] } }), '{"title":"Dish"}');
});
