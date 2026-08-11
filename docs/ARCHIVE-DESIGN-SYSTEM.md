# Mangrok Archive Design System

## Status

Implemented in the `agent/archive-design-system` redesign branch as the first visual-development cycle.

## Design premise

Mangrok should feel like a private culinary archive rather than a generic productivity dashboard. The interface treats recipes as owned records with lineage, permissions, sealed knowledge, and future custodianship.

The visual system is built around five principles:

1. **Culinary heirloom** — recipe cards resemble preserved folios and annotated records.
2. **Controlled intimacy** — privacy and sealed content are visible, calm, and understandable rather than alarmist.
3. **Ceremony over utility chrome** — printing, legacy, and sharing feel deliberate without making routine tasks difficult.
4. **Editorial clarity** — strong serif hierarchy is paired with a highly legible sans-serif control layer.
5. **Original implementation** — all CSS and SVG artwork in this branch were created for Mangrok. No Framer template code, imagery, fonts, or licensed assets are included.

## Visual language

### Palette

- **Archive forest** `#102821` / `#18382f`: trust, containment, and navigation.
- **Parchment** `#f2e8d3`: the primary application field.
- **Paper** `#fffaf0`: recipe folios, forms, dialogs, and reading surfaces.
- **Ink** `#211a15`: primary text.
- **Oxblood** `#8e3528`: sealed notes, primary actions, and irreversible decisions.
- **Brass** `#b68b49`: rules, book details, focus states, and custodial accents.
- **Jade** `#3f795f`: connected and trusted states.

### Typography

The system intentionally uses durable system font stacks rather than downloadable font files:

- Display and narrative text: Iowan Old Style, Palatino, Book Antiqua, Georgia, serif.
- Controls and supporting text: Avenir Next, Avenir, Segoe UI, system-ui, sans-serif.

This preserves performance, privacy, and platform compatibility while creating a literary tone.

## Component translation

| Product object | Archive expression |
| --- | --- |
| Primary navigation | Book-spine archive index |
| Recipe card | Numbered folio with folded corner and privacy spine |
| Privacy status | Custodial stamp and colored record rule |
| Sealed note | Oxblood wax-seal treatment |
| Search and filters | Archive catalog controls |
| Trusted circles | Stewardship register |
| Print studio | Bound-book composition desk |
| Legacy plan | Future-custodian record |
| Dialog | Parchment document with brass ruling |
| Empty state | Unwritten archive folio |

## Interaction rules

- Motion is restrained to short lifts and reveals; reduced-motion preferences disable nonessential movement.
- Keyboard focus is always visible with a brass outline.
- Touch targets remain at least 42 pixels on primary controls.
- Privacy is never communicated by color alone; labels and text remain present.
- Sealed content retains an explicit warning and cannot be silently printed.
- Mobile retains all core workflows through a compact archival tab bar.

## Framer boundary

The selected Framer direction is a reference for emotional tone and public-site storytelling, not a source-code dependency. A purchased, authorized Framer template can later be used for a public marketing experience such as `mangrok.com`, while the secure application can remain at `app.mangrok.com`.

Until an authorized template project or remix link is supplied, the application redesign remains an original Mangrok implementation and does not reproduce Relic or any other marketplace template.

## Next design cycles

1. Refine product copy from generic software language into the archive vocabulary without reducing clarity.
2. Add optional recipe-cover imagery and a curated collection/volume view.
3. Build a public storytelling page once a licensed Framer project is available.
4. Run real-device accessibility and usability testing with invited families.
