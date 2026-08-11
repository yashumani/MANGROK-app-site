/**
 * Curated data library for Mangrok recipe entry.
 * Visuals are rendered from original generated culinary photography; this module stores labels only.
 */
function expand(groups) {
  return Object.entries(groups).flatMap(([category, rows]) =>
    rows.trim().split("\n").map(name => name.trim()).filter(Boolean).map((name, visualIndex) =>
      Object.freeze({ name, category, visualIndex })
    )
  );
}

const ingredientGroups = {
  "Vegetables": `Tomato
Potato
Onion
Garlic
Carrot
Broccoli
Leafy greens
Cucumber
Bell pepper
Chili pepper
Eggplant
Corn
Mushroom
Green peas
Beans
Ginger
Avocado
Lettuce
Pumpkin
Olives
Bean sprouts
Peanuts`,
  "Fruit": `Apple
Pear
Orange
Lemon
Banana
Watermelon
Grapes
Strawberry
Blueberry
Cherry
Peach
Mango
Pineapple
Kiwi
Coconut
Olive fruit
Melon
Green apple`,
  "Herbs & spices": `Basil
Coriander
Parsley
Mint
Rosemary
Thyme
Oregano
Sage
Dill
Bay leaf
Cumin
Turmeric
Paprika
Black pepper
White pepper
Cinnamon
Cardamom
Clove
Mustard seed
Nutmeg
Saffron
Fennel seed
Fenugreek
Chili flakes
Salt
Allspice`,
  "Grains & pasta": `Rice
Wheat flour
Whole-wheat flour
Oats
Barley
Quinoa
Couscous
Bulgur
Spaghetti
Penne
Noodles
Dumpling wrappers
Flatbread
Bread
Semolina
Cornmeal`,
  "Proteins": `Chicken
Beef
Lamb
Pork
Fish
Shrimp
Crab
Lobster
Mussels
Egg
Tofu
Lentils
Chickpeas
Black beans
Kidney beans
Tempeh`,
  "Dairy & alternatives": `Milk
Butter
Cheddar
Mozzarella
Parmesan
Yogurt
Cream
Coconut milk
Almond milk
Oat milk
Cream cheese
Feta`,
  "Oils, sauces & condiments": `Olive oil
Sunflower oil
Coconut oil
Ghee
Soy sauce
Fish sauce
Tomato paste
Ketchup
Mustard
Mayonnaise
Hot sauce
Honey
Maple syrup
Vinegar
Lemon juice
Peanut butter
Tahini
Worcestershire sauce`,
  "Baking": `Granulated sugar
Brown sugar
Icing sugar
Baking powder
Baking soda
Cocoa powder
Chocolate
Chocolate chips
Vanilla
Almonds
Walnuts
Pecans
Raisins
Desiccated coconut
Yeast
Cornstarch`,
  "Pantry": `Canned tomatoes
Canned beans
Coconut cream
Stock
Bouillon
Breadcrumbs
Pickles
Capers
Jam
Tea
Coffee
Sea salt
Kosher salt
Gelatin
Sushi rice
Tuna`
};

const equipmentGroups = {
  "Cookware": `Frying pan
Cast-iron skillet
Saucepan
Stockpot
Dutch oven
Wok
Sauté pan
Steamer basket
Griddle
Fondue pot
Pressure cooker
Tagine`,
  "Utensils": `Chef knife
Paring knife
Bread knife
Wooden spoon
Slotted spoon
Ladle
Tongs
Spatula
Fish turner
Chopsticks
Whisk
Silicone spatula
Serving spoon
Carving fork
Skimmer
Pasta server`,
  "Prep tools": `Cutting board
Mixing bowl
Colander
Fine-mesh sieve
Box grater
Citrus zester
Vegetable peeler
Can opener
Bottle opener
Garlic press
Mortar and pestle
Kitchen scale
Measuring cups
Measuring spoons
Salad spinner
Apple corer
Mandoline slicer
Meat tenderizer`,
  "Baking tools": `Baking sheet
Cake pan
Muffin tin
Pie dish
Loaf pan
Parchment paper
Rolling pin
Pastry brush
Bench scraper
Cookie cutters
Piping bag
Oven thermometer
Cooling rack
Springform pan`,
  "Appliances": `Oven
Stovetop
Microwave
Blender
Food processor
Stand mixer
Hand mixer
Rice cooker
Toaster
Sandwich press
Air fryer
Slow cooker
Refrigerator
Freezer
Coffee grinder
Waffle maker`,
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
Carafe`
};

export const INGREDIENT_LIBRARY = Object.freeze(expand(ingredientGroups));
export const EQUIPMENT_LIBRARY = Object.freeze(expand(equipmentGroups));
export const KITCHEN_LIBRARY_COUNTS = Object.freeze({
  ingredients: INGREDIENT_LIBRARY.length,
  equipment: EQUIPMENT_LIBRARY.length,
  total: INGREDIENT_LIBRARY.length + EQUIPMENT_LIBRARY.length
});

export function kitchenCategories(mode = "ingredients") {
  const source = mode === "equipment" ? EQUIPMENT_LIBRARY : INGREDIENT_LIBRARY;
  return ["All", ...new Set(source.map(item => item.category))];
}

export function findKitchenItem(name, mode = "ingredients") {
  const source = mode === "equipment" ? EQUIPMENT_LIBRARY : INGREDIENT_LIBRARY;
  const needle = String(name || "").trim().toLowerCase();
  return source.find(item => item.name.toLowerCase() === needle) || null;
}
