# Mangrok

**Mangrok is a local-first recipe vault for recipes that are too valuable to lose and too personal to publish carelessly.**

This repository contains the first free, installable web MVP. It works as a responsive website and progressive web app without a paid backend, paid hosting, or third-party tracking.

> **Naming note:** “Mangrok” is the current working product name. Public launch branding should remain subject to formal trademark and market clearance.

## What works today

- Add, edit, search, filter, favorite, and delete recipes.
- Store a separate sealed note for the secret ingredient, ratio, timing, or technique.
- Mark recipes as **Only me**, **Family vault**, **Trusted circle**, or **Open recipe**.
- Share a recipe as text or download a portable `.mangrok-recipe.json` file, with the secret note included only by choice.
- Select recipes and print a clean cookbook, with an explicit switch for secret notes.
- Back up and restore the entire vault as JSON.
- Install the site as a progressive web app and use the cached app shell offline.
- Keep all recipe data in the current browser through `localStorage`.

## Important privacy boundary

This MVP is **local-first, not account-secured**. The screen-cover action hides content from casual view, but recipes are not yet encrypted and there is no server-side authentication. Anyone with access to the same browser profile may be able to inspect browser storage.

The secure cloud phase should add authenticated accounts, encrypted data storage, invite-only sharing, revocable links, access logs, and recovery safeguards before the app is positioned as a security product.

## Run locally

No build tools or package installation are required.

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

Service workers require `localhost` or HTTPS. Opening `index.html` directly will display the interface, but installation and offline caching may not activate.

## Deploy for free with GitHub Pages

The included workflow publishes the static files to GitHub Pages after changes reach `main`.

In the repository, open **Settings → Pages** and choose **GitHub Actions** as the source once. Future pushes to `main` will deploy automatically.

## Current architecture

```text
index.html                 Application shell and accessible dialogs
styles.css                 Responsive UI, component styles, and print layouts
app.js                     Data model, local persistence, sharing, backup, and UI behavior
manifest.webmanifest       Installable PWA metadata
sw.js                      Offline app-shell cache
assets/mangrok-mark.svg    Original Mangrok application mark
.github/workflows/pages.yml
```

## Product roadmap

### Phase 2 — Secure accounts

- Email or passkey sign-in.
- Private cloud synchronization across devices.
- Row-level access controls for every recipe.
- Encrypted backups and safer account recovery.

### Phase 3 — Permission-based sharing

- Invitations to family and trusted circles.
- View-only access, expiry dates, and revocation.
- Separate permission for the sealed secret layer.
- Recipient and access history.

### Phase 4 — Preservation and print

- Handwritten recipe-card capture.
- Voice memories and family stories.
- Recipe lineage, custodians, and version history.
- Professionally printed books and gift editions.

### Phase 5 — Legacy

- Designated future recipients.
- Release instructions for legacy recipes.
- Family collections and collaborative editing.

## Data format

Vault backups use a versioned JSON envelope:

```json
{
  "type": "mangrok.vault",
  "version": 1,
  "exportedAt": "2026-08-10T00:00:00.000Z",
  "recipes": []
}
```

Portable recipe files use `type: "mangrok.recipe"` and may omit the sealed secret note.
