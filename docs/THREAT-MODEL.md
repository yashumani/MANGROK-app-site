# Threat model

## Assets

Recipe content, sealed-note plaintext, encryption passphrases, family stories, media, collaborator identities, access history, print proofs, legacy instructions, authentication sessions, and provider credentials.

## Trust boundaries

- Browser/device
- Supabase Auth, database, Storage, and Edge Functions
- Email delivery
- Print provider and shipping partners
- Human legacy-review operation
- Recipient devices outside Mangrok

## Primary threats and controls

| Threat | Control |
|---|---|
| Horizontal data access | RLS helper functions and two-user negative tests |
| Contributor privilege escalation | Database trigger blocks ownership, privacy, and sealed-field changes |
| Browser credential exposure | Anonymous key only; service role restricted to Edge Functions |
| Secret theft at rest | AES-GCM client encryption; passphrase never stored |
| Share-link database leak | Random token hashed in database; optional secret encrypted with fragment key |
| Link replay | Expiration, maximum views, view counter lock, and revocation |
| Unsafe media access | Private buckets, UUID path ownership, access-linked metadata |
| Duplicate print orders | Unique owner/request ID and idempotency header |
| Secret print leakage | Explicit approval, private proof, short signed URL, operator proof review |
| False legacy release | Review-only cron; no automated recipient delivery or decryption |
| Account takeover | Provider MFA/passkey roadmap, secure email controls, session monitoring |
| Local device compromise | Honest device-mode warning, cover screen only as convenience, encrypted sealed layer |

## Residual risks

Visible content can be copied. Malicious browser extensions and compromised devices can observe plaintext. A forgotten passphrase cannot be recovered. Email magic links inherit email-account security. Legal validity of legacy instructions depends on jurisdiction and operating procedures.
