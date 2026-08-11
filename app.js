const STORAGE_KEY = "mangrok.vault.v1";
const STORAGE_VERSION = 1;

const privacyMeta = {
  private: {
    label: "Only me",
    short: "Private",
    description: "Kept inside your personal vault.",
  },
  family: {
    label: "Family vault",
    short: "Family",
    description: "Marked for sharing with family.",
  },
  trusted: {
    label: "Trusted circle",
    short: "Trusted",
    description: "Reserved for individually selected people.",
  },
  open: {
    label: "Open recipe",
    short: "Open",
    description: "Ready for broad sharing.",
  },
};

const iconPaths = {
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11h14V8"/><path d="M10 12h4"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  book: '<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22.5z"/><path d="M4 5.5v17"/>',
  "book-open": '<path d="M2.5 5.5A4.5 4.5 0 0 1 7 3h4v16H7a4.5 4.5 0 0 0-4.5 2z"/><path d="M21.5 5.5A4.5 4.5 0 0 0 17 3h-4v16h4a4.5 4.5 0 0 1 4.5 2z"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 8-8M15 8l3 3M17 6l2 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  "chevron-down": '<path d="m6 9 6 6 6-6"/>',
  "chevron-right": '<path d="m9 18 6-6-6-6"/>',
  "arrow-left": '<path d="m19 12H5M12 19l-7-7 7-7"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  "file-down": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 12v6m-3-3 3 3 3-3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  upload: '<path d="M12 21V9"/><path d="m17 14-5-5-5 5"/><path d="M5 3h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  tag: '<path d="M20.6 13.6 11 23.2 1.8 14V4.8h9.2z"/><circle cx="6.5" cy="9.5" r="1.2"/>',
  sparkles: '<path d="m12 3 1.2 3.1L16 7.5l-2.8 1.4L12 12l-1.2-3.1L8 7.5l2.8-1.4Z"/><path d="m19 13 .8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8Z"/><path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8Z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  steps: '<path d="M9 5h11M9 12h11M9 19h11"/><circle cx="4" cy="5" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="19" r="1.5"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
  "eye-off": '<path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c6.5 0 10 8 10 8a17.7 17.7 0 0 1-2.2 3.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 8 10 8a10 10 0 0 0 4.1-.9"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
};

const now = Date.now();
const daysAgo = (days) => new Date(now - days * 86400000).toISOString();

const seedRecipes = [
  {
    id: "seed-sunday-tomato-gravy",
    title: "Sunday Tomato Gravy",
    description: "A slow, glossy tomato sauce made for a crowded table and an unhurried afternoon.",
    category: "Main dish",
    cuisine: "Italian-American",
    prepTime: 25,
    cookTime: 180,
    servings: 8,
    tags: ["family", "sunday", "comfort food"],
    ingredients: [
      { amount: "2 tbsp", item: "extra-virgin olive oil" },
      { amount: "1", item: "yellow onion, finely diced" },
      { amount: "5 cloves", item: "garlic, thinly sliced" },
      { amount: "2 tbsp", item: "tomato paste" },
      { amount: "2 × 28 oz", item: "cans whole peeled tomatoes" },
      { amount: "1 small bunch", item: "fresh basil" },
      { amount: "to taste", item: "sea salt and black pepper" },
    ],
    steps: [
      "Warm the olive oil in a heavy pot over medium-low heat. Cook the onion with a pinch of salt until soft and translucent.",
      "Add the garlic and tomato paste. Cook slowly until the paste darkens and begins to leave a film on the bottom of the pot.",
      "Crush the tomatoes by hand, add them with their juices, and bring the sauce to a very gentle simmer.",
      "Cook uncovered for about three hours, stirring from the bottom every 20 minutes. Add water only if the sauce becomes too thick.",
      "Tear in the basil, season carefully, and rest the sauce for 15 minutes before serving.",
    ],
    secret: "Before adding the tomatoes, let the tomato paste fry until brick red, then loosen the browned layer with three tablespoons of the tomato liquid. That toasted base creates the deep sweetness.",
    story: "This is the sauce that announces Sunday before anyone reaches the kitchen. The pot goes on early, the table fills slowly, and everyone tastes it before dinner even begins.",
    privacy: "family",
    favorite: true,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(2),
  },
  {
    id: "seed-cardamom-milk-bread",
    title: "Cardamom Milk Bread",
    description: "Soft pull-apart bread with a fragrant crumb and a delicate golden crust.",
    category: "Bread",
    cuisine: "Family original",
    prepTime: 35,
    cookTime: 30,
    servings: 10,
    tags: ["baking", "celebration", "make ahead"],
    ingredients: [
      { amount: "3½ cups", item: "bread flour" },
      { amount: "¾ cup", item: "whole milk" },
      { amount: "2¼ tsp", item: "instant yeast" },
      { amount: "⅓ cup", item: "sugar" },
      { amount: "1½ tsp", item: "ground cardamom" },
      { amount: "1", item: "large egg" },
      { amount: "5 tbsp", item: "unsalted butter, softened" },
      { amount: "1 tsp", item: "fine sea salt" },
    ],
    steps: [
      "Whisk a small portion of the flour with milk in a saucepan and cook until it forms a thick paste. Cool until just warm.",
      "Combine the cooled paste with the remaining flour, yeast, sugar, cardamom, egg, and salt. Knead until a rough dough forms.",
      "Work in the softened butter a little at a time, then knead until the dough is smooth, elastic, and slightly tacky.",
      "Let rise until doubled. Divide into equal portions, shape into tight rounds, and arrange in a buttered loaf pan.",
      "Proof until the dough crowns above the pan, brush with milk, and bake until deeply golden.",
    ],
    secret: "Bloom freshly ground cardamom in the warm milk for ten minutes before making the flour paste. The milk captures the aroma more evenly than adding cardamom directly to the dry ingredients.",
    story: "This loaf began as a holiday experiment and became the bread people request by name. It is best torn by hand while still faintly warm.",
    privacy: "trusted",
    favorite: true,
    createdAt: daysAgo(84),
    updatedAt: daysAgo(8),
  },
  {
    id: "seed-midnight-chili-oil",
    title: "Midnight Chili Oil",
    description: "A smoky, savory finishing oil that turns eggs, noodles, and rice into a complete meal.",
    category: "Sauce & condiment",
    cuisine: "Pantry staple",
    prepTime: 15,
    cookTime: 12,
    servings: 16,
    tags: ["spicy", "pantry", "quick"],
    ingredients: [
      { amount: "¾ cup", item: "neutral oil" },
      { amount: "3 tbsp", item: "crushed red pepper" },
      { amount: "1 tbsp", item: "toasted sesame seeds" },
      { amount: "2 tsp", item: "smoked paprika" },
      { amount: "1 tsp", item: "ground cumin" },
      { amount: "2 cloves", item: "garlic, grated" },
      { amount: "1½ tsp", item: "soy sauce" },
      { amount: "½ tsp", item: "sugar" },
    ],
    steps: [
      "Combine the chili, sesame, paprika, cumin, garlic, sugar, and soy sauce in a heatproof bowl.",
      "Heat the oil until a wooden chopstick releases a steady stream of small bubbles when dipped into it.",
      "Pour one-third of the oil over the spice mixture and stir. Repeat twice so the spices bloom without scorching.",
      "Cool completely before transferring to a clean jar. Rest overnight for the fullest flavor.",
    ],
    secret: "Add the soy sauce only after the first pour of hot oil. The brief sizzle rounds its sharp edge without making the finished oil taste cooked or bitter.",
    story: "Created from the need for a five-minute dinner after a very long day. A spoonful over rice remains the fastest route back to feeling fed.",
    privacy: "private",
    favorite: false,
    createdAt: daysAgo(42),
    updatedAt: daysAgo(1),
  },
  {
    id: "seed-brown-butter-pear-cake",
    title: "Brown Butter Pear Cake",
    description: "A simple fruit cake with nutty butter, tender pears, and a crisp sugar top.",
    category: "Dessert",
    cuisine: "Seasonal baking",
    prepTime: 25,
    cookTime: 48,
    servings: 9,
    tags: ["autumn", "dessert", "one bowl"],
    ingredients: [
      { amount: "8 tbsp", item: "unsalted butter" },
      { amount: "1½ cups", item: "all-purpose flour" },
      { amount: "¾ cup", item: "light brown sugar" },
      { amount: "1½ tsp", item: "baking powder" },
      { amount: "2", item: "large eggs" },
      { amount: "½ cup", item: "plain yogurt" },
      { amount: "2", item: "ripe but firm pears" },
      { amount: "2 tbsp", item: "coarse sugar" },
    ],
    steps: [
      "Brown the butter over medium heat until the milk solids are amber and fragrant. Cool for ten minutes.",
      "Whisk the flour, brown sugar, baking powder, and salt in a bowl. Add the eggs, yogurt, and brown butter.",
      "Fold only until no dry flour remains. Spread the batter in a lined pan and fan thin pear slices over the top.",
      "Sprinkle with coarse sugar and bake until the center springs back and the edges pull slightly from the pan.",
    ],
    secret: "Grate one-quarter of a pear directly into the batter and arrange the remaining slices on top. The grated fruit keeps the crumb moist without making the surface soggy.",
    story: "The first version was baked with pears that were a day away from being too soft. It has stayed intentionally unfussy ever since.",
    privacy: "open",
    favorite: false,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(12),
  },
];

const state = {
  recipes: loadRecipes(),
  currentView: "vault",
  privacyFilter: "all",
  query: "",
  sort: "updated",
  activeRecipeId: null,
  shareRecipeId: null,
  revealedSecrets: new Set(),
  printSelection: new Set(),
  installPrompt: null,
};

const elements = {};

function icon(name) {
  const paths = iconPaths[name] || iconPaths.file;
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
}

function cacheElements() {
  Object.assign(elements, {
    vaultGrid: document.querySelector("#vault-recipe-grid"),
    favoritesGrid: document.querySelector("#favorites-recipe-grid"),
    sharedGrid: document.querySelector("#shared-recipe-grid"),
    recipeSearch: document.querySelector("#recipe-search"),
    recipeSort: document.querySelector("#recipe-sort"),
    resultsSummary: document.querySelector("#results-summary"),
    detailDialog: document.querySelector("#recipe-detail-dialog"),
    detailContent: document.querySelector("#recipe-detail-content"),
    editorDialog: document.querySelector("#recipe-editor-dialog"),
    recipeForm: document.querySelector("#recipe-form"),
    shareDialog: document.querySelector("#share-dialog"),
    backupDialog: document.querySelector("#backup-dialog"),
    printList: document.querySelector("#print-recipe-list"),
    printSummary: document.querySelector("#print-selection-summary"),
    bookCoverCount: document.querySelector("#book-cover-count"),
    includeSecrets: document.querySelector("#include-secrets-toggle"),
    printOutput: document.querySelector("#print-book-output"),
    lockScreen: document.querySelector("#vault-lock-screen"),
    importInput: document.querySelector("#import-vault-input"),
    installButton: document.querySelector("#install-button"),
    toastRegion: document.querySelector("#toast-region"),
  });
}

function init() {
  cacheElements();
  renderStaticIcons();
  bindEvents();
  renderAll();
  registerServiceWorker();
}

function renderStaticIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((element) => {
    element.innerHTML = icon(element.dataset.icon);
  });
}

function bindEvents() {
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => navigateTo(button.dataset.nav));
  });

  document.querySelectorAll("[data-privacy-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.privacyFilter = button.dataset.privacyFilter;
      navigateTo("vault");
      updatePrivacyFilterButtons();
      renderVault();
    });
  });

  document.querySelector("#clear-filter-button").addEventListener("click", () => {
    state.privacyFilter = "all";
    state.query = "";
    elements.recipeSearch.value = "";
    updatePrivacyFilterButtons();
    renderVault();
  });

  elements.recipeSearch.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderVault();
  });

  elements.recipeSort.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderVault();
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
    if (event.key === "/" && !isTyping && state.currentView === "vault") {
      event.preventDefault();
      elements.recipeSearch.focus();
    }
    if (event.key === "Escape" && !elements.lockScreen.hidden) {
      unlockVault();
    }
  });

  document.querySelector("#new-recipe-button").addEventListener("click", () => openEditor());
  document.querySelector("#mobile-new-recipe-button").addEventListener("click", () => openEditor());

  [elements.vaultGrid, elements.favoritesGrid, elements.sharedGrid].forEach((grid) => {
    grid.addEventListener("click", handleRecipeGridClick);
  });

  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => closeDialog(document.querySelector(`#${button.dataset.closeDialog}`)));
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
  });

  elements.recipeForm.addEventListener("submit", saveRecipeFromForm);
  elements.detailContent.addEventListener("click", handleDetailAction);

  elements.printList.addEventListener("change", handlePrintSelection);
  document.querySelector("#select-all-button").addEventListener("click", () => {
    state.recipes.forEach((recipe) => state.printSelection.add(recipe.id));
    renderPrintStudio();
  });
  document.querySelector("#select-none-button").addEventListener("click", () => {
    state.printSelection.clear();
    renderPrintStudio();
  });
  document.querySelector("#print-selected-button").addEventListener("click", printSelectedRecipes);

  document.querySelector("#share-recipe-button").addEventListener("click", shareActiveRecipe);
  document.querySelector("#download-recipe-button").addEventListener("click", downloadActiveRecipe);

  document.querySelector("#backup-button").addEventListener("click", () => openDialog(elements.backupDialog));
  document.querySelector("#export-vault-button").addEventListener("click", exportVault);
  document.querySelector("#import-vault-button").addEventListener("click", () => elements.importInput.click());
  elements.importInput.addEventListener("change", importVault);

  document.querySelector("#lock-button").addEventListener("click", lockVault);
  document.querySelector("#unlock-button").addEventListener("click", unlockVault);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPrompt = event;
    elements.installButton.hidden = false;
  });

  elements.installButton.addEventListener("click", installApp);
  window.addEventListener("appinstalled", () => {
    state.installPrompt = null;
    elements.installButton.hidden = true;
    showToast("Mangrok installed", "The vault can now open like an app.");
  });
}

function navigateTo(view) {
  if (!document.querySelector(`[data-view="${view}"]`)) return;
  state.currentView = view;

  document.querySelectorAll("[data-view]").forEach((section) => {
    section.classList.toggle("is-active", section.dataset.view === view);
  });

  document.querySelectorAll(".nav-item[data-nav], .mobile-nav-item[data-nav]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.nav === view);
  });

  if (view === "favorites") renderFavorites();
  if (view === "shared") renderShared();
  if (view === "print") renderPrintStudio();

  document.querySelector("#main-content").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAll() {
  cleanupSelections();
  renderCounts();
  renderVault();
  renderFavorites();
  renderShared();
  renderPrintStudio();
}

function renderCounts() {
  const total = state.recipes.length;
  const favorites = state.recipes.filter((recipe) => recipe.favorite).length;
  const privateCount = state.recipes.filter((recipe) => recipe.privacy === "private").length;
  const sharedCount = state.recipes.filter((recipe) => recipe.privacy !== "private").length;
  const secretCount = state.recipes.filter((recipe) => Boolean(recipe.secret?.trim())).length;

  setText("#nav-vault-count", total);
  setText("#nav-favorites-count", favorites);
  setText("#nav-shared-count", sharedCount);
  setText("#stat-total", total);
  setText("#stat-private", privateCount);
  setText("#stat-shared", sharedCount);
  setText("#stat-favorites", favorites);
  setText("#hero-secret-count", secretCount);
}

function renderVault() {
  let recipes = [...state.recipes];
  const query = state.query.trim().toLowerCase();

  if (state.privacyFilter !== "all") {
    recipes = recipes.filter((recipe) => recipe.privacy === state.privacyFilter);
  }

  if (query) {
    recipes = recipes.filter((recipe) => {
      const haystack = [
        recipe.title,
        recipe.description,
        recipe.category,
        recipe.cuisine,
        recipe.story,
        ...(recipe.tags || []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  recipes = sortRecipes(recipes, state.sort);
  elements.vaultGrid.innerHTML = renderRecipeCollection(recipes, {
    title: query || state.privacyFilter !== "all" ? "No matching recipes" : "Your vault is ready",
    message:
      query || state.privacyFilter !== "all"
        ? "Try a different search or privacy filter."
        : "Add the first recipe that deserves a permanent place in your collection.",
    action: query || state.privacyFilter !== "all" ? "clear" : "new",
  });
  renderStaticIcons(elements.vaultGrid);
  bindEmptyStateActions(elements.vaultGrid);

  const label = state.privacyFilter === "all" ? "All saved recipes" : privacyMeta[state.privacyFilter].label;
  const suffix = recipes.length === 1 ? "1 recipe" : `${recipes.length} recipes`;
  elements.resultsSummary.textContent = `${label} · ${suffix}`;
}

function renderFavorites() {
  const recipes = sortRecipes(
    state.recipes.filter((recipe) => recipe.favorite),
    "updated",
  );
  elements.favoritesGrid.innerHTML = renderRecipeCollection(recipes, {
    title: "No favorites yet",
    message: "Tap the heart on any recipe to keep it in this collection.",
    action: "vault",
  });
  renderStaticIcons(elements.favoritesGrid);
  bindEmptyStateActions(elements.favoritesGrid);
}

function renderShared() {
  const recipes = sortRecipes(
    state.recipes.filter((recipe) => recipe.privacy !== "private"),
    "updated",
  );
  elements.sharedGrid.innerHTML = renderRecipeCollection(recipes, {
    title: "Nothing is marked for sharing",
    message: "Change a recipe's access level when it is ready to leave your personal vault.",
    action: "vault",
  });
  renderStaticIcons(elements.sharedGrid);
  bindEmptyStateActions(elements.sharedGrid);
}

function renderRecipeCollection(recipes, emptyConfig) {
  if (!recipes.length) return emptyStateMarkup(emptyConfig);
  return recipes.map(recipeCardMarkup).join("");
}

function recipeCardMarkup(recipe) {
  const privacy = privacyMeta[recipe.privacy] || privacyMeta.private;
  const totalTime = Number(recipe.prepTime || 0) + Number(recipe.cookTime || 0);
  const categorySlug = slugify(recipe.category);
  const description = recipe.description || "A treasured recipe waiting for its story.";
  const cuisine = recipe.cuisine || recipe.category || "Recipe";
  const favoriteLabel = recipe.favorite ? "Remove from favorites" : "Add to favorites";

  return `
    <article class="recipe-card" data-recipe-id="${escapeAttribute(recipe.id)}" data-category="${escapeAttribute(categorySlug)}">
      <div class="recipe-card-visual">
        <span class="card-privacy-badge">
          <span class="privacy-dot ${escapeAttribute(recipe.privacy)}"></span>
          ${escapeHTML(privacy.short)}
        </span>
        <button
          class="card-favorite-button ${recipe.favorite ? "is-favorite" : ""}"
          type="button"
          data-action="favorite"
          data-recipe-id="${escapeAttribute(recipe.id)}"
          aria-label="${favoriteLabel}"
          aria-pressed="${Boolean(recipe.favorite)}"
        >
          <span class="icon" data-icon="heart" aria-hidden="true"></span>
        </button>
        <span class="recipe-monogram" aria-hidden="true">${escapeHTML(firstLetter(recipe.title))}</span>
      </div>
      <div class="recipe-card-body">
        <p class="recipe-card-kicker">${escapeHTML(cuisine)}</p>
        <button class="recipe-card-title-button" type="button" data-action="open" data-recipe-id="${escapeAttribute(recipe.id)}">
          <h3>${escapeHTML(recipe.title)}</h3>
        </button>
        <p class="recipe-card-description">${escapeHTML(description)}</p>
        <div class="recipe-card-meta">
          <span><span class="icon" data-icon="clock" aria-hidden="true"></span>${escapeHTML(formatTime(totalTime))}</span>
          <span><span class="icon" data-icon="user" aria-hidden="true"></span>${escapeHTML(formatServings(recipe.servings))}</span>
          ${
            recipe.secret?.trim()
              ? '<span class="recipe-card-secret"><span class="icon" data-icon="key" aria-hidden="true"></span>Secret sealed</span>'
              : ""
          }
        </div>
      </div>
    </article>
  `;
}

function emptyStateMarkup({ title, message, action }) {
  const buttonLabel = action === "new" ? "Add first recipe" : action === "clear" ? "Clear filters" : "Return to vault";
  const buttonIcon = action === "new" ? "plus" : action === "clear" ? "x" : "arrow-left";
  return `
    <div class="empty-state">
      <span class="empty-state-icon"><span class="icon" data-icon="book-open" aria-hidden="true"></span></span>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(message)}</p>
      <button class="primary-button" type="button" data-empty-action="${escapeAttribute(action)}">
        <span class="icon" data-icon="${buttonIcon}" aria-hidden="true"></span>
        ${escapeHTML(buttonLabel)}
      </button>
    </div>
  `;
}

function bindEmptyStateActions(root) {
  root.querySelectorAll("[data-empty-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.emptyAction;
      if (action === "new") openEditor();
      if (action === "vault") navigateTo("vault");
      if (action === "clear") {
        state.query = "";
        state.privacyFilter = "all";
        elements.recipeSearch.value = "";
        updatePrivacyFilterButtons();
        renderVault();
      }
    });
  });
}

function handleRecipeGridClick(event) {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const recipeId = actionButton.dataset.recipeId;
  if (actionButton.dataset.action === "open") openRecipeDetail(recipeId);
  if (actionButton.dataset.action === "favorite") toggleFavorite(recipeId);
}

function openRecipeDetail(recipeId) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return;
  state.activeRecipeId = recipeId;
  state.revealedSecrets.delete(recipeId);
  renderRecipeDetail(recipe);
  openDialog(elements.detailDialog);
}

function renderRecipeDetail(recipe) {
  const privacy = privacyMeta[recipe.privacy] || privacyMeta.private;
  const categorySlug = slugify(recipe.category);
  const totalTime = Number(recipe.prepTime || 0) + Number(recipe.cookTime || 0);
  const isSecretVisible = state.revealedSecrets.has(recipe.id);
  const ingredients = recipe.ingredients?.length
    ? recipe.ingredients
        .map(
          (ingredient) => `
            <li>
              <span class="ingredient-amount">${escapeHTML(ingredient.amount || "")}</span>
              <span>${escapeHTML(ingredient.item || "")}</span>
            </li>`,
        )
        .join("")
    : "<li><span></span><span>No ingredients recorded.</span></li>";
  const steps = recipe.steps?.length
    ? recipe.steps.map((step) => `<li>${escapeHTML(step)}</li>`).join("")
    : "<li>No instructions recorded.</li>";
  const tags = recipe.tags?.length
    ? `<div class="recipe-tags">${recipe.tags.map((tag) => `<span class="recipe-tag">#${escapeHTML(tag)}</span>`).join("")}</div>`
    : "";

  elements.detailContent.innerHTML = `
    <div class="detail-hero" data-category="${escapeAttribute(categorySlug)}">
      <div class="detail-privacy-row">
        <span class="privacy-dot ${escapeAttribute(recipe.privacy)}"></span>
        ${escapeHTML(privacy.label)} · ${escapeHTML(recipe.category || "Recipe")}
      </div>
      <div class="detail-title-row">
        <h2 id="detail-title">${escapeHTML(recipe.title)}</h2>
        <button
          class="detail-favorite-button ${recipe.favorite ? "is-favorite" : ""}"
          type="button"
          data-detail-action="favorite"
          aria-label="${recipe.favorite ? "Remove from favorites" : "Add to favorites"}"
          aria-pressed="${Boolean(recipe.favorite)}"
        >
          <span class="icon" data-icon="heart" aria-hidden="true"></span>
        </button>
      </div>
    </div>
    <div class="detail-content-body">
      <p class="detail-summary">${escapeHTML(recipe.description || "A recipe preserved in your Mangrok vault.")}</p>
      <div class="detail-meta-grid">
        <div class="detail-meta-item"><span>Prep</span><strong>${escapeHTML(formatTime(recipe.prepTime))}</strong></div>
        <div class="detail-meta-item"><span>Cook</span><strong>${escapeHTML(formatTime(recipe.cookTime))}</strong></div>
        <div class="detail-meta-item"><span>Total</span><strong>${escapeHTML(formatTime(totalTime))}</strong></div>
        <div class="detail-meta-item"><span>Serves</span><strong>${escapeHTML(String(recipe.servings || "—"))}</strong></div>
      </div>
      <div class="detail-sections">
        <section class="detail-section">
          <h3><span class="icon" data-icon="list" aria-hidden="true"></span>Ingredients</h3>
          <ul class="ingredient-list">${ingredients}</ul>
        </section>
        <section class="detail-section">
          <h3><span class="icon" data-icon="steps" aria-hidden="true"></span>Method</h3>
          <ol class="step-list">${steps}</ol>
        </section>
      </div>
      <section class="secret-section">
        <div class="secret-section-header">
          <h3><span class="icon" data-icon="key" aria-hidden="true"></span>Secret note</h3>
          ${
            recipe.secret?.trim()
              ? `<button class="reveal-secret-button" type="button" data-detail-action="reveal-secret">
                  <span class="icon" data-icon="${isSecretVisible ? "eye-off" : "eye"}" aria-hidden="true"></span>
                  ${isSecretVisible ? "Hide again" : "Break the seal"}
                </button>`
              : ""
          }
        </div>
        ${
          recipe.secret?.trim()
            ? `<p class="secret-content ${isSecretVisible ? "" : "is-hidden"}">${escapeHTML(recipe.secret)}</p>`
            : '<p class="no-secret-note">No secret layer has been recorded for this recipe yet.</p>'
        }
      </section>
      ${
        recipe.story?.trim()
          ? `<section class="story-section">
              <h3><span class="icon" data-icon="book-open" aria-hidden="true"></span>The story</h3>
              <p>${escapeHTML(recipe.story)}</p>
            </section>`
          : ""
      }
      ${tags}
      <div class="detail-actions">
        <button class="secondary-button" type="button" data-detail-action="edit">
          <span class="icon" data-icon="edit" aria-hidden="true"></span>Edit
        </button>
        <button class="secondary-button" type="button" data-detail-action="print">
          <span class="icon" data-icon="printer" aria-hidden="true"></span>Print
        </button>
        <button class="primary-button" type="button" data-detail-action="share">
          <span class="icon" data-icon="share" aria-hidden="true"></span>Share
        </button>
        <button class="danger-button" type="button" data-detail-action="delete">
          <span class="icon" data-icon="trash" aria-hidden="true"></span>Delete
        </button>
      </div>
    </div>
  `;
  renderStaticIcons(elements.detailContent);
}

function handleDetailAction(event) {
  const button = event.target.closest("[data-detail-action]");
  if (!button) return;
  const recipe = getRecipe(state.activeRecipeId);
  if (!recipe) return;

  switch (button.dataset.detailAction) {
    case "favorite":
      toggleFavorite(recipe.id);
      renderRecipeDetail(getRecipe(recipe.id));
      break;
    case "reveal-secret":
      if (state.revealedSecrets.has(recipe.id)) state.revealedSecrets.delete(recipe.id);
      else state.revealedSecrets.add(recipe.id);
      renderRecipeDetail(recipe);
      break;
    case "edit":
      closeDialog(elements.detailDialog);
      openEditor(recipe.id);
      break;
    case "share":
      openShareDialog(recipe.id);
      break;
    case "print":
      buildPrintBook([recipe], state.revealedSecrets.has(recipe.id));
      window.print();
      break;
    case "delete":
      deleteRecipe(recipe.id);
      break;
    default:
      break;
  }
}

function toggleFavorite(recipeId) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return;
  recipe.favorite = !recipe.favorite;
  recipe.updatedAt = new Date().toISOString();
  persistRecipes();
  renderAll();
  showToast(recipe.favorite ? "Added to favorites" : "Removed from favorites", recipe.title);
}

function openEditor(recipeId = null) {
  clearFormErrors();
  elements.recipeForm.reset();
  setFormValue("#recipe-id", "");
  setText("#editor-eyebrow", recipeId ? "Refine what you preserved" : "Add to your vault");
  setText("#editor-dialog-title", recipeId ? "Edit recipe" : "New recipe");

  if (recipeId) {
    const recipe = getRecipe(recipeId);
    if (!recipe) return;
    setFormValue("#recipe-id", recipe.id);
    setFormValue("#recipe-title", recipe.title);
    setFormValue("#recipe-category", recipe.category || "Other");
    setFormValue("#recipe-cuisine", recipe.cuisine || "");
    setFormValue("#recipe-description", recipe.description || "");
    setFormValue("#recipe-prep-time", recipe.prepTime || "");
    setFormValue("#recipe-cook-time", recipe.cookTime || "");
    setFormValue("#recipe-servings", recipe.servings || "");
    setFormValue("#recipe-tags", (recipe.tags || []).join(", "));
    setFormValue(
      "#recipe-ingredients",
      (recipe.ingredients || [])
        .map((ingredient) => `${ingredient.amount ? `${ingredient.amount} | ` : ""}${ingredient.item}`)
        .join("\n"),
    );
    setFormValue("#recipe-steps", (recipe.steps || []).join("\n"));
    setFormValue("#recipe-secret", recipe.secret || "");
    setFormValue("#recipe-story", recipe.story || "");
    const privacyRadio = elements.recipeForm.querySelector(`input[name="privacy"][value="${recipe.privacy}"]`);
    if (privacyRadio) privacyRadio.checked = true;
  }

  openDialog(elements.editorDialog);
  setTimeout(() => document.querySelector("#recipe-title").focus(), 80);
}

function saveRecipeFromForm(event) {
  event.preventDefault();
  clearFormErrors();

  const formData = new FormData(elements.recipeForm);
  const title = String(formData.get("title") || "").trim();
  const ingredientLines = splitLines(formData.get("ingredients"));
  const stepLines = splitLines(formData.get("steps"));

  let valid = true;
  if (!title) {
    setFieldError("title", "Give this recipe a name.");
    valid = false;
  }
  if (!ingredientLines.length) {
    setFieldError("ingredients", "Add at least one ingredient.");
    valid = false;
  }
  if (!stepLines.length) {
    setFieldError("steps", "Add at least one instruction.");
    valid = false;
  }
  if (!valid) {
    elements.recipeForm.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  const existingId = String(formData.get("recipeId") || "").trim();
  const existingRecipe = existingId ? getRecipe(existingId) : null;
  const timestamp = new Date().toISOString();
  const recipe = {
    id: existingRecipe?.id || createId(),
    title,
    description: String(formData.get("description") || "").trim(),
    category: String(formData.get("category") || "Other"),
    cuisine: String(formData.get("cuisine") || "").trim(),
    prepTime: toNonNegativeNumber(formData.get("prepTime")),
    cookTime: toNonNegativeNumber(formData.get("cookTime")),
    servings: toNonNegativeNumber(formData.get("servings")) || 1,
    tags: String(formData.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12),
    ingredients: ingredientLines.map(parseIngredientLine),
    steps: stepLines,
    secret: String(formData.get("secret") || "").trim(),
    story: String(formData.get("story") || "").trim(),
    privacy: String(formData.get("privacy") || "private"),
    favorite: existingRecipe?.favorite || false,
    createdAt: existingRecipe?.createdAt || timestamp,
    updatedAt: timestamp,
  };

  if (existingRecipe) {
    state.recipes = state.recipes.map((item) => (item.id === recipe.id ? recipe : item));
  } else {
    state.recipes.unshift(recipe);
  }

  persistRecipes();
  closeDialog(elements.editorDialog);
  renderAll();
  navigateTo("vault");
  showToast(existingRecipe ? "Recipe updated" : "Recipe sealed in your vault", recipe.title);
  openRecipeDetail(recipe.id);
}

function deleteRecipe(recipeId) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return;
  const confirmed = window.confirm(`Delete “${recipe.title}” from this browser? This cannot be undone unless it exists in a backup.`);
  if (!confirmed) return;

  state.recipes = state.recipes.filter((item) => item.id !== recipeId);
  state.printSelection.delete(recipeId);
  state.revealedSecrets.delete(recipeId);
  persistRecipes();
  closeDialog(elements.detailDialog);
  renderAll();
  showToast("Recipe deleted", recipe.title);
}

function openShareDialog(recipeId) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return;
  state.shareRecipeId = recipeId;
  document.querySelector("#share-include-secret").checked = false;
  document.querySelector("#share-message").value = "";
  setText(
    "#share-description",
    recipe.privacy === "private"
      ? `“${recipe.title}” is marked Only me. Sharing creates a separate copy and does not change that setting.`
      : `Choose what to include when sharing “${recipe.title}.”`,
  );
  openDialog(elements.shareDialog);
}

async function shareActiveRecipe() {
  const recipe = getRecipe(state.shareRecipeId);
  if (!recipe) return;
  const includeSecret = document.querySelector("#share-include-secret").checked;
  const message = document.querySelector("#share-message").value.trim();
  const text = buildShareText(recipe, includeSecret, message);

  try {
    if (navigator.share) {
      await navigator.share({ title: `${recipe.title} · Mangrok`, text });
      showToast("Recipe shared", includeSecret ? "The secret note was included." : "The secret note stayed sealed.");
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showToast("Recipe copied", "Paste it into a message or email.");
    } else {
      fallbackCopy(text);
      showToast("Recipe copied", "Paste it into a message or email.");
    }
    closeDialog(elements.shareDialog);
  } catch (error) {
    if (error?.name !== "AbortError") {
      showToast("Sharing did not complete", "Download the portable recipe file instead.");
    }
  }
}

function downloadActiveRecipe() {
  const recipe = getRecipe(state.shareRecipeId);
  if (!recipe) return;
  const includeSecret = document.querySelector("#share-include-secret").checked;
  const message = document.querySelector("#share-message").value.trim();
  const portableRecipe = {
    type: "mangrok.recipe",
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    message,
    recipe: {
      ...recipe,
      secret: includeSecret ? recipe.secret : "",
      id: createId(),
      updatedAt: new Date().toISOString(),
    },
  };
  downloadJSON(`${safeFilename(recipe.title)}.mangrok-recipe.json`, portableRecipe);
  showToast("Recipe file downloaded", includeSecret ? "Secret note included." : "Secret note excluded.");
}

function buildShareText(recipe, includeSecret, message) {
  const ingredients = recipe.ingredients
    .map((ingredient) => `• ${[ingredient.amount, ingredient.item].filter(Boolean).join(" ")}`)
    .join("\n");
  const steps = recipe.steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
  const sections = [
    message ? `${message}\n` : "",
    `${recipe.title}\n${recipe.description || ""}`.trim(),
    `\nIngredients\n${ingredients}`,
    `\nMethod\n${steps}`,
  ];
  if (includeSecret && recipe.secret) sections.push(`\nSecret note\n${recipe.secret}`);
  sections.push("\nPreserved with Mangrok");
  return sections.filter(Boolean).join("\n");
}

function renderPrintStudio() {
  const recipes = sortRecipes([...state.recipes], "title");
  if (!recipes.length) {
    elements.printList.innerHTML = emptyStateMarkup({
      title: "No recipes to print",
      message: "Add recipes to your vault before creating a collection.",
      action: "new",
    });
    renderStaticIcons(elements.printList);
    bindEmptyStateActions(elements.printList);
    updatePrintSummary();
    return;
  }

  elements.printList.innerHTML = recipes
    .map((recipe) => {
      const selected = state.printSelection.has(recipe.id);
      const privacy = privacyMeta[recipe.privacy] || privacyMeta.private;
      return `
        <label class="print-list-item ${selected ? "is-selected" : ""}">
          <input type="checkbox" value="${escapeAttribute(recipe.id)}" ${selected ? "checked" : ""} />
          <span class="custom-checkbox"><span class="icon" data-icon="check" aria-hidden="true"></span></span>
          <span class="print-list-monogram" aria-hidden="true">${escapeHTML(firstLetter(recipe.title))}</span>
          <span class="print-list-copy">
            <strong>${escapeHTML(recipe.title)}</strong>
            <small>${escapeHTML(recipe.category || "Recipe")} · ${escapeHTML(formatTime(Number(recipe.prepTime || 0) + Number(recipe.cookTime || 0)))}</small>
          </span>
          <span class="print-list-privacy"><span class="privacy-dot ${escapeAttribute(recipe.privacy)}"></span>${escapeHTML(privacy.short)}</span>
        </label>
      `;
    })
    .join("");
  renderStaticIcons(elements.printList);
  updatePrintSummary();
}

function handlePrintSelection(event) {
  const checkbox = event.target.closest('input[type="checkbox"]');
  if (!checkbox) return;
  if (checkbox.checked) state.printSelection.add(checkbox.value);
  else state.printSelection.delete(checkbox.value);
  renderPrintStudio();
}

function updatePrintSummary() {
  const count = state.printSelection.size;
  elements.printSummary.textContent = count ? `${count} ${count === 1 ? "recipe" : "recipes"} selected` : "Nothing selected yet";
  elements.bookCoverCount.textContent = count ? `${count} ${count === 1 ? "recipe" : "recipes"} selected` : "0 recipes selected";
}

function printSelectedRecipes() {
  const selected = state.recipes.filter((recipe) => state.printSelection.has(recipe.id));
  if (!selected.length) {
    showToast("Choose at least one recipe", "Select the recipes that belong in this printed collection.");
    return;
  }
  buildPrintBook(sortRecipes(selected, "title"), elements.includeSecrets.checked);
  window.print();
}

function buildPrintBook(recipes, includeSecrets) {
  const tableOfContents = recipes.map((recipe) => `<li>${escapeHTML(recipe.title)}</li>`).join("");
  const pages = recipes
    .map((recipe) => {
      const ingredients = recipe.ingredients
        .map((ingredient) => `<li>${escapeHTML([ingredient.amount, ingredient.item].filter(Boolean).join(" "))}</li>`)
        .join("");
      const steps = recipe.steps.map((step) => `<li>${escapeHTML(step)}</li>`).join("");
      const totalTime = Number(recipe.prepTime || 0) + Number(recipe.cookTime || 0);
      return `
        <article class="print-recipe-page">
          <p class="print-recipe-kicker">${escapeHTML(recipe.category || "Recipe")} · ${escapeHTML(recipe.cuisine || "Mangrok collection")}</p>
          <h2>${escapeHTML(recipe.title)}</h2>
          ${recipe.description ? `<p class="print-recipe-description">${escapeHTML(recipe.description)}</p>` : ""}
          <div class="print-meta">
            <span>Prep: ${escapeHTML(formatTime(recipe.prepTime))}</span>
            <span>Cook: ${escapeHTML(formatTime(recipe.cookTime))}</span>
            <span>Total: ${escapeHTML(formatTime(totalTime))}</span>
            <span>Serves: ${escapeHTML(String(recipe.servings || "—"))}</span>
          </div>
          <div class="print-columns">
            <section><h3>Ingredients</h3><ul>${ingredients}</ul></section>
            <section><h3>Method</h3><ol>${steps}</ol></section>
          </div>
          ${recipe.story ? `<section class="print-story"><h3>The story</h3><p>${escapeHTML(recipe.story)}</p></section>` : ""}
          ${includeSecrets && recipe.secret ? `<section class="print-secret"><h3>Secret note</h3><p>${escapeHTML(recipe.secret)}</p></section>` : ""}
        </article>
      `;
    })
    .join("");

  elements.printOutput.innerHTML = `
    <section class="print-cover-page">
      <small>THE MANGROK COLLECTION</small>
      <h1>Recipes Worth Keeping</h1>
      <p>${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"} preserved from the vault</p>
    </section>
    <section class="print-toc"><h2>Contents</h2><ol>${tableOfContents}</ol></section>
    ${pages}
  `;
}

function exportVault() {
  const payload = {
    type: "mangrok.vault",
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    recipes: state.recipes,
  };
  downloadJSON(`mangrok-vault-${formatDateForFilename(new Date())}.json`, payload);
  closeDialog(elements.backupDialog);
  showToast("Vault backup downloaded", `${state.recipes.length} ${state.recipes.length === 1 ? "recipe" : "recipes"} saved.`);
}

async function importVault(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const importedRecipes = normalizeImportedPayload(parsed);
    if (!importedRecipes.length) throw new Error("No valid recipes found");

    const existingIds = new Set(state.recipes.map((recipe) => recipe.id));
    const normalized = importedRecipes.map((recipe) => {
      const item = normalizeRecipe(recipe);
      if (existingIds.has(item.id)) item.id = createId();
      existingIds.add(item.id);
      return item;
    });

    state.recipes = [...normalized, ...state.recipes];
    persistRecipes();
    closeDialog(elements.backupDialog);
    renderAll();
    showToast("Backup restored", `${normalized.length} ${normalized.length === 1 ? "recipe" : "recipes"} added to this device.`);
  } catch (error) {
    showToast("Could not restore that file", "Choose a valid Mangrok vault or recipe JSON file.");
  }
}

function normalizeImportedPayload(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.recipes)) return parsed.recipes;
  if (parsed?.recipe && typeof parsed.recipe === "object") return [parsed.recipe];
  if (parsed?.title && Array.isArray(parsed?.ingredients)) return [parsed];
  return [];
}

function normalizeRecipe(recipe) {
  const timestamp = new Date().toISOString();
  return {
    id: typeof recipe.id === "string" && recipe.id ? recipe.id : createId(),
    title: String(recipe.title || "Untitled recipe").slice(0, 80),
    description: String(recipe.description || "").slice(0, 220),
    category: String(recipe.category || "Other").slice(0, 60),
    cuisine: String(recipe.cuisine || "").slice(0, 50),
    prepTime: toNonNegativeNumber(recipe.prepTime),
    cookTime: toNonNegativeNumber(recipe.cookTime),
    servings: toNonNegativeNumber(recipe.servings) || 1,
    tags: Array.isArray(recipe.tags) ? recipe.tags.map(String).slice(0, 12) : [],
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients
          .map((ingredient) => {
            if (typeof ingredient === "string") return { amount: "", item: ingredient };
            return { amount: String(ingredient?.amount || ""), item: String(ingredient?.item || "") };
          })
          .filter((ingredient) => ingredient.item)
      : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps.map(String).filter(Boolean) : [],
    secret: String(recipe.secret || "").slice(0, 900),
    story: String(recipe.story || "").slice(0, 1200),
    privacy: Object.hasOwn(privacyMeta, recipe.privacy) ? recipe.privacy : "private",
    favorite: Boolean(recipe.favorite),
    createdAt: isValidDate(recipe.createdAt) ? recipe.createdAt : timestamp,
    updatedAt: isValidDate(recipe.updatedAt) ? recipe.updatedAt : timestamp,
  };
}

function loadRecipes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(seedRecipes);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.recipes)) return structuredClone(seedRecipes);
    return parsed.recipes.map(normalizeRecipe);
  } catch (error) {
    return structuredClone(seedRecipes);
  }
}

function persistRecipes() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, updatedAt: new Date().toISOString(), recipes: state.recipes }),
    );
  } catch (error) {
    showToast("Could not save locally", "Browser storage may be unavailable or full. Download a backup now.");
  }
}

function cleanupSelections() {
  const ids = new Set(state.recipes.map((recipe) => recipe.id));
  [...state.printSelection].forEach((id) => {
    if (!ids.has(id)) state.printSelection.delete(id);
  });
}

function updatePrivacyFilterButtons() {
  document.querySelectorAll("[data-privacy-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.privacyFilter === state.privacyFilter);
  });
}

function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
  else dialog.setAttribute("open", "");
  document.body.style.overflow = "hidden";
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === "function" && dialog.open) dialog.close();
  else dialog.removeAttribute("open");
  if (!document.querySelector("dialog[open]")) document.body.style.overflow = "";
}

function lockVault() {
  elements.lockScreen.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => document.querySelector("#unlock-button").focus(), 50);
}

function unlockVault() {
  elements.lockScreen.hidden = true;
  document.body.style.overflow = "";
  document.querySelector("#lock-button").focus();
}

async function installApp() {
  if (!state.installPrompt) return;
  state.installPrompt.prompt();
  await state.installPrompt.userChoice;
  state.installPrompt = null;
  elements.installButton.hidden = true;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Offline installation is a progressive enhancement; the app still works without it.
    });
  });
}

function showToast(title, message = "") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <span class="icon" data-icon="check" aria-hidden="true"></span>
    <span><strong>${escapeHTML(title)}</strong>${message ? `<small>${escapeHTML(message)}</small>` : ""}</span>
  `;
  renderStaticIcons(toast);
  elements.toastRegion.append(toast);
  const remove = () => {
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 180);
  };
  setTimeout(remove, 3600);
}

function sortRecipes(recipes, sort) {
  return [...recipes].sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "time") {
      const aTime = Number(a.prepTime || 0) + Number(a.cookTime || 0);
      const bTime = Number(b.prepTime || 0) + Number(b.cookTime || 0);
      return aTime - bTime || a.title.localeCompare(b.title);
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function parseIngredientLine(line) {
  const separatorIndex = line.indexOf("|");
  if (separatorIndex === -1) return { amount: "", item: line.trim() };
  return {
    amount: line.slice(0, separatorIndex).trim(),
    item: line.slice(separatorIndex + 1).trim(),
  };
}

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function setFieldError(name, message) {
  const field = elements.recipeForm.elements[name];
  const error = elements.recipeForm.querySelector(`[data-error-for="${name}"]`);
  if (field) field.setAttribute("aria-invalid", "true");
  if (error) error.textContent = message;
}

function clearFormErrors() {
  elements.recipeForm?.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute("aria-invalid"));
  elements.recipeForm?.querySelectorAll(".field-error").forEach((error) => {
    error.textContent = "";
  });
}

function getRecipe(id) {
  return state.recipes.find((recipe) => recipe.id === id);
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = String(value);
}

function setFormValue(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.value = value ?? "";
}

function firstLetter(value) {
  return String(value || "M").trim().charAt(0).toUpperCase() || "M";
}

function formatTime(minutes) {
  const value = Math.max(0, Number(minutes || 0));
  if (!value) return "Not set";
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const remainder = value % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

function formatServings(servings) {
  const value = Number(servings || 0);
  if (!value) return "Servings not set";
  return value === 1 ? "1 serving" : `${value} servings`;
}

function slugify(value) {
  return String(value || "other")
    .toLowerCase()
    .trim()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function safeFilename(value) {
  return slugify(value) || "mangrok-recipe";
}

function formatDateForFilename(date) {
  return date.toISOString().slice(0, 10);
}

function createId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `recipe-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

function isValidDate(value) {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value).replaceAll("`", "&#096;");
}

function downloadJSON(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

init();
