# Mangrok Food Studio design direction

## Chosen Framer references

The visual direction combines two food-focused Framer patterns without copying marketplace source or assets:

- **Flavourist** for recipe-first information architecture, editorial typography, warm light/dark presentation, categories, and food-specific search.
- **Qitchen** for immersive culinary atmosphere, strong visual rhythm, minimal dark surfaces, and responsive storytelling.

Mangrok remains a functional encrypted recipe vault rather than a restaurant or public recipe blog. The implementation is therefore original and keeps the existing application, storage, encryption, sharing, print, and legacy architecture intact.

## Food-first design principles

1. The header always names the product **Mangrok**; the active workspace becomes secondary context.
2. Food color is functional: olive for culinary structure, tomato for actions and protected material, saffron for selection and focus, cream for reading surfaces, and cocoa for premium editorial sections.
3. Ingredient and equipment selection uses consistent illustrated tiles that work offline and do not depend on third-party trackers or image CDNs.
4. Manual entry is always available because no fixed catalog can represent every regional ingredient, family utensil, or inherited vessel.
5. Equipment is stored as portable `tool:` tags so existing local storage, cloud sync, backup, search, and sharing remain backward compatible.

## Visual kitchen library

The initial library contains:

- 160 ingredients across vegetables, fruit, herbs and spices, grains, proteins, dairy, sauces, baking, and pantry staples.
- 88 equipment choices across cookware, utensils, preparation tools, baking tools, appliances, serving, and storage.
- Search, category filters, multi-select, custom entries, selected-item removal, and responsive mobile layouts.

Selected ingredients are added to the existing ingredient list for quantity editing. Equipment is hidden from the ordinary tag editor and presented as a dedicated kitchen-setup section in the recipe viewer.

## Licensing boundary

No Framer marketplace template code, imagery, fonts, screenshots, or paid assets are included in this repository. A purchased or authorized Framer project may later power Mangrok's public marketing site. This implementation is the original functional application interface.
