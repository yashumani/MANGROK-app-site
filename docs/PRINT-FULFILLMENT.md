# Print fulfillment runbook

The browser print studio is complete and can save a reviewed PDF locally. Physical fulfillment is intentionally fail-closed.

1. User composes a book and explicitly approves any included sealed notes.
2. A reviewed 6 × 9 PDF is uploaded to the private `print-proofs` bucket under `userId/bookId/requestId.pdf`.
3. `print-order` verifies the authenticated owner, book, proof path, and idempotency key.
4. Without provider credentials, the order becomes `provider_not_configured`; no external request is made.
5. With a provider configured, the function creates a 15-minute signed proof URL and submits it with an idempotency header.
6. Webhooks or an operator update printing, shipping, cancellation, and failure states.

Before activation, add proof generation/upload UI, provider webhook signature verification, shipping-address handling, pricing, taxes, refunds, content policy, data-processing terms, and retention/deletion controls. Never send the browser's sealed-note passphrase to a provider.
