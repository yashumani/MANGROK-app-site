# Deployment

## GitHub Pages

The Pages workflow runs tests and validation, builds `dist/`, uploads that directory, and deploys it. Pages must use **GitHub Actions** as its source. HTTPS must remain enforced.

## Runtime configuration

`runtime-config.js` is deliberately public. Set only:

- Supabase project URL
- Supabase anonymous key
- Edge Function names
- support email

Never set database passwords, provider secrets, or a service-role key.

## Supabase

Apply `supabase/migrations/001_platform.sql` to a new project. Enable email magic-link authentication, set the exact production redirect URL, configure rate limits and bot protection, deploy Edge Functions, and store secrets through Supabase secrets management. Run acceptance tests before public sign-up.

## Rollback

GitHub Pages can be rolled back by reverting the merge commit and redeploying. Database changes require a reviewed forward migration; do not edit an applied production migration. Export and test backups before every schema change.
