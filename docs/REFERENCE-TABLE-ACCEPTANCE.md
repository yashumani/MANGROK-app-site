# Reference Table acceptance criteria

1. The Vault displays an image-led reference collection without hiding existing private recipes.
2. Reference cards expose dish name, cuisine or tradition, region, time, difficulty, dietary tags, allergens, source state, and review date.
3. A recipe detail view contains independently written ingredients, ordered steps, equipment, cultural context, adaptation note, and source links.
4. **Use as a starting point** creates an editable private copy and records the reference ID in lineage.
5. Editing or deleting the private copy cannot modify the immutable reference.
6. Reference content remains available offline after the PWA shell is installed.
7. The UI remains usable at 320 px width and does not create document-level horizontal scrolling.
8. Alchemy can consume the cloned recipe's ingredients and equipment without changing its existing provider model.
9. Generated illustrations are decorative and are never presented as evidence of a tested physical outcome.
10. `npm run check` and the single Pages deployment workflow must pass on the exact release commit.
