# Local AI

Mangrok provides three modes: an offline deterministic culinary engine, an opt-in WebLLM model running through WebGPU, and a self-hosted OpenAI-compatible endpoint such as Ollama. Model weights are cached by the runtime and are not committed to Git.

For Ollama, use `http://127.0.0.1:11434/v1` and a model such as `mangrok-alchemy`. Do not expose an unauthenticated model port to the public internet. Commercial access should pass through the authenticated Mangrok gateway, which meters entitlements before forwarding a prompt.
