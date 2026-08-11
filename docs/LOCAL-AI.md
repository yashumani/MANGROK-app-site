# Local and self-hosted AI

Mangrok always keeps the explainable deterministic culinary engine available. Language-model refinement is optional.

## On-device WebLLM

The configured model is downloaded by the WebLLM runtime and cached in the browser. Model weights are not committed to this repository. WebGPU support, memory capacity, download size, and browser compatibility vary by device.

Use Settings → System readiness to confirm WebGPU availability. A failed model load falls back to the deterministic assessment.

## Self-hosted OpenAI-compatible endpoint

For Ollama, use an endpoint such as:

```text
http://127.0.0.1:11434/v1
```

and a model such as `mangrok-alchemy` or `llama3.2`. The application normalizes `/v1`, `/models`, and `/chat/completions` paths and applies request timeouts and bounded response parsing.

The endpoint must permit the Mangrok origin through CORS. Use Settings → System readiness → Test local AI to verify connectivity and inspect the reported model list.

Never expose an unauthenticated local model port to the public internet.

## Subscriber gateway

Commercial access should pass through the authenticated Supabase `alchemy-ai` function. The function validates input before consuming a credit, uses request IDs for idempotency, refunds failed model calls, constrains allowed origins, and forwards only bounded structured messages to the private model service.

Apply `003_alchemy_production.sql` before deploying the updated function. Store `SUPABASE_SERVICE_ROLE_KEY` only in the Edge Function environment; it is used solely for private completion/refund bookkeeping and must never appear in `runtime-config.js` or browser code.
