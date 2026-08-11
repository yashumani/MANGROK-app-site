# Security policy

## Supported version

The `main` branch and latest deployed release are supported. Do not send real recipe secrets in public GitHub issues.

## Reporting

Use GitHub's private vulnerability reporting feature if enabled. Until a dedicated address is configured, repository administrators should provide a private contact method in the security settings.

## Security properties

- Database row-level security is the authorization boundary in cloud mode.
- Browser code contains only a public anonymous key; service-role credentials exist only in server functions.
- Sealed notes are encrypted in the browser with AES-GCM. The passphrase is not stored or sent to Supabase.
- A share-link secret key stays after `#` in the URL, which browsers do not send in HTTP requests. Users must still protect the full link from browser extensions, screenshots, and clipboard history.
- Storage buckets are private. Signed URLs are short-lived and created server-side.
- Physical printing requires a reviewed PDF proof and explicit confirmation before secret material can leave the vault.
- Legacy timers only create a review task. They never release content.

## Known limitations

A recipient who can view a recipe can photograph, transcribe, or otherwise copy it. Client-side encryption cannot protect plaintext while it is visible. Device-only data can be inspected by anyone controlling the same browser profile or device. Browser backups omit binary attachments.

See `docs/THREAT-MODEL.md` and `docs/ACCEPTANCE-TESTS.md` before production activation.
