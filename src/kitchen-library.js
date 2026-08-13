import {
  getIngredientCatalog,
  ingredientCatalogStats,
  ingredientCategories,
  cuisineTraditions,
  resolveIngredient,
  searchIngredients
} from "./ingredient-catalog.js";

function expandEquipment(groups) {
  return Object.entries(groups).flatMap(([category, rows]) => rows.trim().split("\n").map(name => name.trim()).filter(Boolean).map((name, visualIndex) => Object.freeze({ name, category, visualIndex, aliases: [], cuisines: [], status: "published", source: "mangrok-curated" })));
}

const equipmentGroups = {
  "Cookware": `Frying pan
Cast-iron skillet
Carbon-steel skillet
Nonstick skillet
Saucepan
Saucier
Stockpot
Dutch oven
Wok
Clay pot
Donabe
Dolsot
Tagine
Braising pan
Sauté pan
Steamer basket
Bamboo steamer
Griddle
Comal
Tawa
Kadai
Paella pan
Crepe pan
Roasting pan
Casserole dish
Fondue pot
Pressure cooker
Stovetop pressure cooker
Canning pot
Fish poacher
Tamale steamer`,
  "Utensils": `Chef knife
Santoku knife
Nakiri knife
Cleaver
Paring knife
Boning knife
Fillet knife
Bread knife
Kitchen shears
Wooden spoon
Slotted spoon
Ladle
Tongs
Spatula
Fish turner
Chopsticks
Cooking chopsticks
Whisk
Balloon whisk
Silicone spatula
Serving spoon
Carving fork
Skimmer
Spider strainer
Pasta server
Rice paddle
Tortilla press
Molcajete
Suribachi
Potato masher
Meat thermometer
Instant-read thermometer
Candy thermometer`,
  "Prep tools": `Cutting board
Mixing bowl
Colander
Fine-mesh sieve
Tamis
Box grater
Microplane
Citrus zester
Vegetable peeler
Can opener
Bottle opener
Garlic press
Mortar and pestle
Spice grinder
Coffee grinder
Kitchen scale
Measuring cups
Measuring spoons
Salad spinner
Apple corer
Mandoline slicer
Meat tenderizer
Potato ricer
Food mill
Citrus press
Juicer
Pasta machine
Dough scraper
Bench scraper
Cheesecloth
Muslin cloth
Nut milk bag
Sushi mat
Basting brush
Marinade injector`,
  "Baking tools": `Baking sheet
Half-sheet pan
Cake pan
Muffin tin
Pie dish
Loaf pan
Bundt pan
Parchment paper
Silicone baking mat
Rolling pin
Pastry brush
Pastry cutter
Cookie cutters
Piping bag
Piping tips
Oven thermometer
Cooling rack
Springform pan
Tart pan
Soufflé dish
Ramekins
Proofing basket
Pizza stone
Pizza steel
Pizza peel
Dough docker`,
  "Appliances": `Oven
Convection oven
Stovetop
Induction cooktop
Microwave
Blender
Immersion blender
Food processor
Stand mixer
Hand mixer
Rice cooker
Toaster
Toaster oven
Sandwich press
Air fryer
Slow cooker
Multi-cooker
Sous vide circulator
Dehydrator
Refrigerator
Freezer
Waffle maker
Electric griddle
Electric skillet
Electric pressure cooker
Bread machine
Ice cream maker
Yogurt maker
Meat grinder
Grain mill
Vacuum sealer`,
  "Outdoor & fire": `Charcoal grill
Gas grill
Pellet grill
Kamado grill
Smoker
Tandoor
Pizza oven
Dutch-oven tripod
Grill basket
Grill grate
Plancha
Rotisserie
Skewers
Fireproof gloves
Chimney starter`,
  "Serving & storage": `Dinner plate
Serving bowl
Pitcher
Glass jar
Food container
Lunch box
Spice jar
Bread basket
Cake stand
Salt cellar
Tea pot
Carafe
Bento box
Tiffin carrier
Crock
Fermentation jar
Pickling weight
Vacuum container
Insulated food jar
Serving platter
Soup tureen`
};

export const INGREDIENT_LIBRARY = getIngredientCatalog();
export const EQUIPMENT_LIBRARY = Object.freeze(expandEquipment(equipmentGroups));
export const KITCHEN_LIBRARY_COUNTS = Object.freeze({
  ingredients: ingredientCatalogStats().total,
  equipment: EQUIPMENT_LIBRARY.length,
  total: ingredientCatalogStats().total + EQUIPMENT_LIBRARY.length,
  cuisines: ingredientCatalogStats().cuisines,
  catalogVersion: ingredientCatalogStats().version
});

export function kitchenCategories(mode = "ingredients") {
  return mode === "equipment" ? ["All", ...new Set(EQUIPMENT_LIBRARY.map(item => item.category))] : ingredientCategories();
}
export function kitchenCuisines() { return cuisineTraditions(); }
export function findKitchenItem(name, mode = "ingredients") {
  if (mode === "ingredients") return resolveIngredient(name);
  const needle = String(name || "").trim().toLowerCase();
  return EQUIPMENT_LIBRARY.find(item => item.name.toLowerCase() === needle) || null;
}
export function searchKitchenItems({ mode = "ingredients", query = "", category = "All", cuisine = "All traditions", limit = 500 } = {}) {
  if (mode === "ingredients") return searchIngredients({ query, category, cuisine, limit }).items;
  const needle = String(query || "").trim().toLowerCase();
  return EQUIPMENT_LIBRARY.filter(item => (category === "All" || item.category === category) && (!needle || `${item.name} ${item.category}`.toLowerCase().includes(needle))).slice(0, limit);
}
