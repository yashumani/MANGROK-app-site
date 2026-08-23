# Recipe Atelier redesign release checklist

- [ ] Complete module graph resolves from a clean checkout.
- [ ] `npm run check` passes.
- [ ] Reference recipes render with original artwork and source metadata.
- [ ] Cloning creates an editable private recipe without mutating the reference.
- [ ] Vault, sharing, sealed notes, backups, Print Studio, and Legacy remain functional.
- [ ] Rules, WebLLM, self-hosted OpenAI-compatible inference, and private gateway remain available.
- [ ] Alchemy progress, cancellation, fallback, and trial handling remain unchanged.
- [ ] Mobile 320, 390, 412, 768, and desktop layouts have no horizontal overflow.
- [ ] One GitHub Pages workflow deploys the exact tested commit.
- [ ] Post-deployment smoke test verifies the reference table, Alchemy, and current cache version.
