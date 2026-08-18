export const REFERENCE_RECIPE_VERSION = "2026.08-atelier.1";

export const REFERENCE_RECIPES = Object.freeze([
  recipe({
    id: "cacio-e-pepe",
    title: "Cacio e pepe",
    subtitle: "Roman pasta built from cheese, pepper, starch, and technique",
    tradition: "Roman and central Italian",
    region: "Lazio, Italy",
    image: "./assets/reference-recipes/cacio-e-pepe.svg",
    time: 25,
    difficulty: "Focused",
    servings: 2,
    dietary: ["Vegetarian"],
    allergens: ["Milk", "Wheat"],
    equipment: ["Wide skillet", "Large pot", "Fine grater", "Tongs"],
    context: "A deliberately spare Roman pasta whose texture depends on a stable emulsion rather than cream. Cheese, pasta water, pan temperature, and agitation matter more than ingredient count.",
    adaptation: "Mangrok standardizes the portion and cooling step so the Pecorino is less likely to clump. Roman cooks vary the pan method, pepper treatment, and pasta shape.",
    ingredients: [
      "180 g spaghetti or tonnarelli",
      "85 g finely grated Pecorino Romano",
      "1 1/2 teaspoons freshly cracked black pepper",
      "Fine salt for the pasta water",
      "180–240 ml reserved starchy pasta water, as needed"
    ],
    steps: [
      "Toast the black pepper in a wide dry skillet over medium heat until fragrant, then remove the skillet from direct heat.",
      "Cook the pasta in less water than usual so the water becomes noticeably starchy. Salt conservatively because Pecorino is salty.",
      "Whisk the grated Pecorino with enough warm—not boiling—pasta water to make a thick, smooth paste.",
      "Transfer the pasta to the pepper skillet while still very al dente. Add a little pasta water and toss until the surface is glossy.",
      "Let the pan cool briefly, then add the cheese paste gradually while tossing continuously. Loosen with small additions of pasta water until creamy.",
      "Serve immediately with additional pepper. If the cheese tightens, correct with warm pasta water rather than direct high heat."
    ],
    sources: [
      source("Accademia Italiana della Cucina", "https://www.accademiaitalianadellacucina.it/", "Italian culinary context"),
      source("Serious Eats — Cacio e Pepe", "https://www.seriouseats.com/spaghetti-cacio-e-pepe-recipe", "Technique cross-check")
    ]
  }),
  recipe({
    id: "miso-soup",
    title: "Miso soup",
    subtitle: "Dashi, miso, and restrained heat",
    tradition: "Japanese washoku",
    region: "Japan",
    image: "./assets/reference-recipes/miso-soup.svg",
    time: 20,
    difficulty: "Gentle",
    servings: 4,
    dietary: ["Pescatarian"],
    allergens: ["Soy", "Fish may be present in dashi"],
    equipment: ["Saucepan", "Fine sieve or ladle", "Small bowl"],
    context: "Miso soup is a flexible daily preparation. The dashi, miso type, seasonal additions, and regional style vary; the reference emphasizes preserving aroma by avoiding a hard boil after the miso is added.",
    adaptation: "The reference uses tofu and wakame as an accessible example. Kombu-shiitake dashi can replace fish-based dashi for a plant-based version.",
    ingredients: [
      "800 ml dashi",
      "3–4 tablespoons miso, adjusted to its salt level",
      "150 g soft or medium tofu, cut into small cubes",
      "1 tablespoon dried wakame, rehydrated",
      "2 scallions, thinly sliced"
    ],
    steps: [
      "Warm the dashi in a saucepan until steaming. Keep it below a vigorous boil.",
      "Add the tofu and wakame and heat gently until the tofu is warmed through.",
      "Place the miso in a small bowl or ladle. Whisk in a little hot dashi until smooth.",
      "Lower the heat and stir the loosened miso into the pot. Do not boil strongly after this point.",
      "Taste before adding more miso. Serve promptly with scallions."
    ],
    sources: [
      source("Japan Ministry of Agriculture, Forestry and Fisheries — Our Regional Cuisines", "https://www.maff.go.jp/e/policies/market/k_ryouri/", "Cultural and regional context"),
      source("Just One Cookbook — Homemade Miso Soup", "https://www.justonecookbook.com/homemade-miso-soup/", "Method cross-check")
    ]
  }),
  recipe({
    id: "bibimbap",
    title: "Bibimbap",
    subtitle: "Rice, separately seasoned vegetables, sauce, and contrast",
    tradition: "Korean hansik",
    region: "Korea",
    image: "./assets/reference-recipes/bibimbap.svg",
    time: 55,
    difficulty: "Layered",
    servings: 4,
    dietary: ["Adaptable"],
    allergens: ["Soy", "Sesame", "Egg", "Wheat may be present in gochujang"],
    equipment: ["Rice cooker or saucepan", "Skillet", "Mixing bowls"],
    context: "Bibimbap brings rice together with vegetables and other toppings that are prepared and seasoned individually. Regional versions, household toppings, and the use of a heated stone bowl vary widely.",
    adaptation: "This reference uses spinach, soybean sprouts, carrot, zucchini, mushrooms, egg, and optional beef. It is a learning template rather than a claim of one definitive topping set.",
    ingredients: [
      "600 g cooked short-grain rice",
      "150 g spinach",
      "180 g soybean sprouts",
      "1 carrot, cut into fine matchsticks",
      "1 small zucchini, cut into matchsticks",
      "150 g shiitake or other mushrooms, sliced",
      "200 g thinly sliced beef, optional",
      "4 eggs",
      "2 tablespoons toasted sesame oil, divided",
      "2 teaspoons toasted sesame seeds",
      "Soy sauce and salt for seasoning",
      "Gochujang sauce for serving"
    ],
    steps: [
      "Cook the rice and keep it warm. Prepare each topping separately so its color and texture remain distinct.",
      "Blanch the spinach briefly, cool, squeeze dry, and season lightly with sesame oil, sesame seed, and salt.",
      "Cook the soybean sprouts until tender-crisp, drain, and season. Sauté the carrot, zucchini, and mushrooms separately with minimal oil and salt.",
      "If using beef, marinate lightly with soy sauce, garlic, sesame oil, and a little sugar, then cook quickly in a hot skillet.",
      "Fry the eggs to the preferred doneness. Food-safety requirements for eggs vary by jurisdiction and diner.",
      "Divide rice among bowls and arrange toppings in separate sections. Add egg and serve with gochujang so each diner can mix and adjust."
    ],
    sources: [
      source("Korean Food Promotion Institute", "https://www.hansik.or.kr/", "Hansik context"),
      source("Maangchi — Bibimbap", "https://www.maangchi.com/recipe/bibimbap", "Ingredient and method cross-check")
    ]
  }),
  recipe({
    id: "chana-masala",
    title: "Chana masala",
    subtitle: "Chickpeas in a tangy, aromatic tomato masala",
    tradition: "North Indian and Punjabi-associated home cooking",
    region: "Indian subcontinent",
    image: "./assets/reference-recipes/chana-masala.svg",
    time: 45,
    difficulty: "Approachable",
    servings: 4,
    dietary: ["Vegan", "Gluten-free when spices are uncontaminated"],
    allergens: [],
    equipment: ["Heavy saucepan or kadai", "Wooden spoon"],
    context: "Chana masala varies by household and region. Sourness may come from amchur, anardana, tamarind, or citrus; the spice profile and amount of tomato also vary.",
    adaptation: "The reference uses cooked chickpeas and amchur or lemon for accessibility. It does not replace regional chole preparations with their darker tea, spice, or long-simmered profiles.",
    ingredients: [
      "500 g cooked chickpeas, drained, plus 120 ml cooking liquid or water",
      "2 tablespoons neutral oil or ghee",
      "1 teaspoon cumin seed",
      "1 medium onion, finely chopped",
      "1 tablespoon grated ginger",
      "3 garlic cloves, minced",
      "250 g crushed tomato",
      "1 teaspoon ground coriander",
      "1/2 teaspoon ground cumin",
      "1/2 teaspoon turmeric",
      "Chili powder to taste",
      "1 teaspoon garam masala",
      "1 teaspoon amchur, or lemon to finish",
      "Salt and chopped cilantro"
    ],
    steps: [
      "Heat the fat and bloom the cumin seed until aromatic without burning it.",
      "Cook the onion with a pinch of salt until deeply softened and lightly browned.",
      "Add ginger and garlic, followed by the ground spices. Stir briefly so the spices bloom in the fat.",
      "Add tomato and cook until the masala thickens and the fat begins to separate at the edges.",
      "Add chickpeas and liquid. Simmer until the sauce clings to the chickpeas, crushing a small portion for body.",
      "Finish with garam masala and amchur or lemon. Adjust salt and garnish with cilantro."
    ],
    sources: [
      source("Incredible India", "https://www.incredibleindia.gov.in/", "Regional culinary context"),
      source("Swasthi’s Recipes — Chana Masala", "https://www.indianhealthyrecipes.com/chana-masala/", "Method and variation cross-check")
    ]
  }),
  recipe({
    id: "hummus",
    title: "Hummus",
    subtitle: "Chickpea and tahini emulsion with lemon and garlic",
    tradition: "Levantine and Eastern Mediterranean",
    region: "Levant and neighboring Eastern Mediterranean cuisines",
    image: "./assets/reference-recipes/hummus.svg",
    time: 20,
    difficulty: "Approachable",
    servings: 6,
    dietary: ["Vegan", "Gluten-free"],
    allergens: ["Sesame"],
    equipment: ["Food processor or high-speed blender", "Fine sieve, optional"],
    context: "Hummus is shared across several culinary traditions and is subject to many regional and household preferences. Texture depends on chickpea tenderness, tahini, water, and processing—not on adding dairy.",
    adaptation: "This reference prioritizes a smooth, pourable texture and does not make an exclusive origin claim. Warm chickpeas or peeled chickpeas can produce a silkier result.",
    ingredients: [
      "500 g very tender cooked chickpeas, warm if possible",
      "120 g tahini",
      "60 ml fresh lemon juice",
      "1 small garlic clove",
      "3/4 teaspoon fine salt, plus more to taste",
      "80–140 ml ice water",
      "Extra-virgin olive oil and chickpeas for serving, optional"
    ],
    steps: [
      "Blend the tahini, lemon juice, garlic, and salt until pale and thickened.",
      "With the machine running, add ice water gradually until the tahini mixture becomes light and smooth.",
      "Add the chickpeas and process thoroughly, stopping to scrape the bowl. Add more water in small amounts until smooth and spoonable.",
      "Taste for salt and acidity. Rest briefly so the texture settles.",
      "Spread on a plate and finish as desired. Keep allergen labelling clear because tahini is sesame."
    ],
    sources: [
      source("UNESCO — Mediterranean diet", "https://ich.unesco.org/en/RL/00884", "Shared food-culture context"),
      source("The Mediterranean Dish — Hummus", "https://www.themediterraneandish.com/how-to-make-hummus/", "Technique cross-check")
    ]
  }),
  recipe({
    id: "guacamole",
    title: "Guacamole",
    subtitle: "Avocado, chile, salt, and fresh acidity",
    tradition: "Mexican culinary traditions",
    region: "Mexico",
    image: "./assets/reference-recipes/guacamole.svg",
    time: 15,
    difficulty: "Immediate",
    servings: 4,
    dietary: ["Vegan", "Gluten-free"],
    allergens: [],
    equipment: ["Molcajete or mixing bowl", "Knife", "Fork or pestle"],
    context: "Guacamole has deep Indigenous roots and many regional and household forms. Tomato, onion, cilantro, chile type, and texture are variable; ripe avocado and balanced seasoning are central.",
    adaptation: "The reference includes optional tomato and cilantro and uses a bowl when a molcajete is unavailable. It does not treat optional additions as universal requirements.",
    ingredients: [
      "3 ripe avocados",
      "1–2 serrano or jalapeño chiles, finely chopped",
      "2 tablespoons finely chopped white onion",
      "1 tablespoon fresh lime juice, plus more to taste",
      "1/2 teaspoon fine salt, plus more to taste",
      "2 tablespoons chopped cilantro, optional",
      "1 small ripe tomato, seeded and diced, optional"
    ],
    steps: [
      "Pound or mash the chile, onion, and salt into a coarse paste.",
      "Add the avocado and mash to the preferred texture, leaving some pieces intact if desired.",
      "Fold in lime juice and optional cilantro and tomato without overworking the mixture.",
      "Taste immediately for salt, chile, and acidity. Serve promptly and limit air exposure to slow browning."
    ],
    sources: [
      source("UNESCO — Traditional Mexican cuisine", "https://ich.unesco.org/en/RL/00400", "Cultural context"),
      source("Mexico in My Kitchen — Guacamole", "https://www.mexicoinmykitchen.com/guacamole-recipe/", "Variation cross-check")
    ]
  }),
  recipe({
    id: "ratatouille",
    title: "Ratatouille",
    subtitle: "Provençal vegetables cooked for distinct texture and a unified finish",
    tradition: "Provençal French cooking",
    region: "Provence, France",
    image: "./assets/reference-recipes/ratatouille.svg",
    time: 65,
    difficulty: "Patient",
    servings: 6,
    dietary: ["Vegan", "Gluten-free"],
    allergens: [],
    equipment: ["Wide heavy pot", "Skillet", "Chef knife"],
    context: "Ratatouille is a vegetable preparation with many valid methods. Cooking the vegetables in stages protects texture and prevents the dish from becoming watery; some cooks combine everything earlier.",
    adaptation: "Mangrok uses separately browned eggplant and zucchini, then a tomato-pepper base. The method is optimized for a home stovetop rather than visual layering for presentation.",
    ingredients: [
      "1 medium eggplant, cut into 2 cm pieces",
      "2 zucchini, cut into 2 cm pieces",
      "1 red bell pepper, cut into pieces",
      "1 yellow bell pepper, cut into pieces",
      "1 large onion, sliced",
      "4 garlic cloves, sliced",
      "500 g ripe tomatoes, chopped, or good canned tomatoes",
      "5 tablespoons olive oil, divided",
      "2 sprigs thyme",
      "1 bay leaf",
      "Salt, black pepper, and basil to finish"
    ],
    steps: [
      "Salt the eggplant lightly and let it stand while the other vegetables are prepared; pat dry before cooking.",
      "Brown the eggplant in batches with olive oil, then brown the zucchini separately. Reserve both.",
      "Cook the onion and peppers until softened. Add garlic and cook briefly without browning it heavily.",
      "Add tomatoes, thyme, and bay leaf. Simmer until the base begins to thicken.",
      "Fold in the eggplant and zucchini and simmer gently until tender but still identifiable.",
      "Remove the bay leaf, adjust seasoning, and finish with basil and olive oil. The dish is also good after resting."
    ],
    sources: [
      source("France.fr — French gastronomy", "https://www.france.fr/en/theme/french-gastronomy/", "Regional culinary context"),
      source("BBC Good Food — Ratatouille", "https://www.bbcgoodfood.com/recipes/ratatouille", "Method cross-check")
    ]
  }),
  recipe({
    id: "tom-yum-goong",
    title: "Tom yum goong",
    subtitle: "Hot-sour prawn soup with fresh Thai aromatics",
    tradition: "Central Thai culinary traditions",
    region: "Thailand",
    image: "./assets/reference-recipes/tom-yum-goong.svg",
    time: 35,
    difficulty: "Aromatic",
    servings: 4,
    dietary: ["Pescatarian"],
    allergens: ["Shellfish", "Fish"],
    equipment: ["Saucepan", "Mortar or knife"],
    context: "Tom yum balances aromatic broth, heat, salt, and fresh acidity. Clear and creamy versions exist, and ingredient intensity varies with the aromatics and chile preparation.",
    adaptation: "This is a clear-broth reference. Lime juice is added away from a hard boil so its fresh aroma remains distinct.",
    ingredients: [
      "900 ml light chicken, seafood, or mushroom stock",
      "2 stalks lemongrass, bruised and cut into lengths",
      "5 thin slices galangal",
      "5 makrut lime leaves, torn",
      "200 g mushrooms, halved",
      "300 g raw prawns or shrimp, peeled and deveined",
      "2–3 tablespoons fish sauce",
      "2–4 Thai chiles, bruised, to taste",
      "60 ml fresh lime juice, adjusted to taste",
      "Cilantro or sawtooth coriander for serving"
    ],
    steps: [
      "Bring the stock to a simmer with lemongrass, galangal, and makrut lime leaves. Infuse gently for about 8 minutes.",
      "Add mushrooms and simmer until nearly tender.",
      "Add the prawns and cook only until opaque and properly done; timing depends on size.",
      "Season with fish sauce and chile. Remove from strong heat before adding lime juice.",
      "Taste for an intentional hot-sour-salty balance. Serve with herbs and explain that the fibrous aromatics are normally left in the bowl but not eaten."
    ],
    sources: [
      source("Thai SELECT", "https://thaiselect.com/", "Thai culinary context"),
      source("Hot Thai Kitchen — Tom Yum Goong", "https://hot-thai-kitchen.com/tom-yum-goong/", "Technique and variation cross-check")
    ]
  }),
  recipe({
    id: "misir-wot",
    title: "Misir wot",
    subtitle: "Red lentils, berbere, and a slowly developed onion base",
    tradition: "Ethiopian cooking",
    region: "Ethiopia",
    image: "./assets/reference-recipes/misir-wot.svg",
    time: 60,
    difficulty: "Layered",
    servings: 6,
    dietary: ["Vegan when oil is used", "Gluten-free when spices are uncontaminated"],
    allergens: ["Milk if niter kibbeh is used"],
    equipment: ["Heavy saucepan", "Wooden spoon"],
    context: "Misir wot relies on a patient onion base and berbere. Spice blends, fat, texture, and heat vary by household; niter kibbeh contributes a different aroma than neutral oil.",
    adaptation: "The reference offers either niter kibbeh or oil and uses split red lentils for accessibility. Berbere strength varies substantially, so the quantity must be adjusted.",
    ingredients: [
      "300 g split red lentils, rinsed",
      "2 large onions, very finely chopped",
      "3 tablespoons niter kibbeh or neutral oil",
      "2–4 tablespoons berbere, adjusted to strength",
      "3 garlic cloves, minced",
      "1 tablespoon grated ginger",
      "1 tablespoon tomato paste, optional",
      "900 ml water or light stock, plus more as needed",
      "Salt to taste"
    ],
    steps: [
      "Cook the onion in a heavy dry pan over medium-low heat, stirring often, until collapsed and lightly colored. Add small splashes of water if it catches.",
      "Add the niter kibbeh or oil, then garlic and ginger. Cook until aromatic.",
      "Stir in the berbere and optional tomato paste and cook briefly, taking care not to scorch the spices.",
      "Add lentils and water. Simmer gently, stirring more often as the mixture thickens.",
      "Cook until the lentils are completely tender and the stew is cohesive. Add water to control thickness and salt near the end."
    ],
    sources: [
      source("Ethiopia Travel", "https://www.ethiopia.travel/", "National culinary context"),
      source("The Daring Gourmet — Misir Wat", "https://www.daringgourmet.com/misir-wat-ethiopian-spiced-red-lentils/", "Method cross-check")
    ]
  }),
  recipe({
    id: "jollof-rice",
    title: "Jollof rice",
    subtitle: "A West African tomato-pepper rice reference with explicit regional variation",
    tradition: "West African culinary traditions",
    region: "West Africa",
    image: "./assets/reference-recipes/jollof-rice.svg",
    time: 75,
    difficulty: "Layered",
    servings: 6,
    dietary: ["Adaptable"],
    allergens: [],
    equipment: ["Heavy pot with tight lid", "Blender", "Wooden spoon"],
    context: "Jollof rice is shared across West Africa and has strongly identified national and household styles. Rice choice, smoke, tomato concentration, pepper profile, stock, spices, and bottom crust differ. Mangrok does not declare one country’s version universal.",
    adaptation: "This reference is a neutral learning framework: cook down a pepper-tomato base, season it, then steam parboiled long-grain rice in the sauce. Users should select a national or family profile before calling a version definitive.",
    ingredients: [
      "500 g parboiled long-grain rice, rinsed",
      "400 g canned or ripe tomatoes",
      "2 red bell peppers",
      "1–2 hot chiles, to taste",
      "2 large onions, divided",
      "3 tablespoons tomato paste",
      "80 ml neutral oil",
      "750–900 ml stock, adjusted to rice",
      "1 teaspoon dried thyme",
      "1 teaspoon curry powder, optional and style-dependent",
      "2 bay leaves",
      "Salt and black pepper"
    ],
    steps: [
      "Blend tomatoes, peppers, chiles, and one onion until smooth.",
      "Cook the remaining sliced onion in oil until softened. Add tomato paste and fry until darkened but not burned.",
      "Add the blended mixture and cook it down thoroughly until reduced, concentrated, and no longer raw-tasting.",
      "Season the base with thyme, bay, salt, pepper, and any style-specific spices. Add stock and bring to a simmer.",
      "Stir in the rice, cover tightly, and cook over low heat. Avoid frequent stirring, which can break the grains.",
      "Check liquid and doneness near the end. Rest covered before fluffing. Record the selected national or family style in the private clone."
    ],
    sources: [
      source("FAO — West African food and agriculture resources", "https://www.fao.org/africa/en/", "Regional context"),
      source("Immaculate Bites — Jollof Rice", "https://www.africanbites.com/jellof-riceoven-baked/", "Technique cross-check")
    ]
  }),
  recipe({
    id: "harira",
    title: "Harira",
    subtitle: "Moroccan tomato, pulse, herb, and spice soup",
    tradition: "Moroccan cooking",
    region: "Morocco",
    image: "./assets/reference-recipes/harira.svg",
    time: 90,
    difficulty: "Patient",
    servings: 8,
    dietary: ["Adaptable"],
    allergens: ["Wheat when flour thickener or vermicelli is used", "Celery"],
    equipment: ["Large heavy pot", "Blender, optional"],
    context: "Harira is associated with Moroccan home cooking and Ramadan tables, with many household variations. Meat, chickpeas, lentils, herbs, vermicelli, rice, and thickening methods vary.",
    adaptation: "The reference is meatless and uses a light flour-and-water tadouira. A household version may include lamb or beef and a different grain or thickener.",
    ingredients: [
      "400 g crushed tomatoes",
      "1 onion, finely chopped",
      "2 celery stalks with leaves, finely chopped",
      "1 large bunch cilantro and parsley, finely chopped",
      "150 g cooked chickpeas",
      "100 g brown or green lentils",
      "1 teaspoon ground ginger",
      "1/2 teaspoon turmeric",
      "1/2 teaspoon black pepper",
      "2 tablespoons olive oil",
      "1.5 litres water or stock",
      "35 g flour whisked with 120 ml water",
      "Salt and lemon to serve"
    ],
    steps: [
      "Cook the onion and celery in olive oil until softened. Add ginger, turmeric, and pepper and stir until aromatic.",
      "Add tomatoes, herbs, lentils, chickpeas, and water or stock. Simmer until the lentils are tender and the flavors are integrated.",
      "Whisk the flour slurry again and add it in a thin stream while stirring. Simmer until the soup lightly thickens and no raw flour taste remains.",
      "Adjust the consistency with water, season with salt, and finish with lemon at the table.",
      "Label wheat and celery clearly. If vermicelli or meat is added in a private version, update allergens and timing."
    ],
    sources: [
      source("Visit Morocco", "https://www.visitmorocco.com/en", "Moroccan cultural context"),
      source("Taste of Maroc — Harira", "https://tasteofmaroc.com/moroccan-harira-soup-recipe/", "Household method and variation cross-check")
    ]
  }),
  recipe({
    id: "peruvian-ceviche",
    title: "Peruvian-style ceviche reference",
    subtitle: "Fresh fish, lime, ají, onion, and a clear raw-seafood safety boundary",
    tradition: "Peruvian ceviche practices",
    region: "Peru",
    image: "./assets/reference-recipes/peruvian-ceviche.svg",
    time: 25,
    difficulty: "High care",
    servings: 4,
    dietary: ["Gluten-free when ingredients are uncontaminated"],
    allergens: ["Fish"],
    equipment: ["Non-reactive chilled bowl", "Very sharp knife", "Refrigerator"],
    context: "Peruvian ceviche practices are regionally varied and culturally significant. Fish type, ají, citrus, accompaniments, and leche de tigre style differ. Acid changes texture but does not reliably eliminate all raw-seafood hazards.",
    adaptation: "This reference is intentionally conservative and requires fish suitable for raw consumption from a trusted source. People who are pregnant, immunocompromised, very young, older, or otherwise vulnerable should follow professional local health guidance regarding raw seafood.",
    ingredients: [
      "500 g very fresh firm white fish suitable for raw consumption, kept cold",
      "120 ml freshly squeezed lime juice, adjusted to acidity",
      "1 small red onion, sliced very thin and rinsed briefly",
      "1 ají limo or other appropriate fresh chile, finely sliced",
      "1 teaspoon fine salt, adjusted to taste",
      "2 tablespoons chopped cilantro",
      "Cooked sweet potato and corn for serving, optional"
    ],
    steps: [
      "Confirm the fish is appropriate for raw consumption and has been handled according to local food-safety guidance. Keep fish, bowl, and tools cold and prevent cross-contamination.",
      "Cut the fish into even bite-size pieces with a clean sharp knife and return it to refrigeration while preparing the remaining ingredients.",
      "Combine fish with salt and chile, then add lime juice and gently mix. The contact time is a style choice, not a safety control.",
      "Fold in onion and cilantro and serve promptly with the chosen accompaniments.",
      "Discard leftovers that have been held unsafely. Do not claim that citrus has made raw fish microbiologically equivalent to cooked fish."
    ],
    sources: [
      source("UNESCO — Peruvian ceviche practices", "https://ich.unesco.org/en/RL/01964", "Cultural-heritage context"),
      source("U.S. FDA — Selecting and Serving Fresh and Frozen Seafood Safely", "https://www.fda.gov/consumers/consumer-updates/selecting-and-serving-fresh-and-frozen-seafood-safely", "Raw seafood safety boundary")
    ]
  }),
  recipe({
    id: "shakshuka",
    title: "Shakshuka",
    subtitle: "Eggs gently set in a spiced tomato and pepper base",
    tradition: "North African and Middle Eastern-associated cooking",
    region: "North Africa and the Middle East",
    image: "./assets/reference-recipes/shakshuka.svg",
    time: 40,
    difficulty: "Approachable",
    servings: 4,
    dietary: ["Vegetarian", "Gluten-free when accompaniments are suitable"],
    allergens: ["Egg"],
    equipment: ["Wide lidded skillet", "Wooden spoon"],
    context: "Shakshuka has multiple regional histories and contemporary forms. Tomato, pepper, chile, spice, egg texture, and garnish vary; this reference avoids an exclusive national origin claim.",
    adaptation: "The reference uses cumin, paprika, and fresh peppers. A private version may add harissa, preserved lemon, feta, greens, or other regionally meaningful ingredients.",
    ingredients: [
      "2 tablespoons olive oil",
      "1 onion, sliced",
      "1 red bell pepper, sliced",
      "3 garlic cloves, sliced",
      "1 teaspoon ground cumin",
      "1 teaspoon sweet paprika",
      "Chile to taste",
      "800 g chopped tomatoes",
      "4–6 eggs",
      "Salt, black pepper, and chopped herbs"
    ],
    steps: [
      "Cook the onion and pepper in olive oil until soft and lightly colored.",
      "Add garlic and spices and stir just until aromatic.",
      "Add tomatoes, season, and simmer until the sauce is thick enough to hold shallow wells.",
      "Make wells and add the eggs. Cover and cook gently until the whites meet the desired doneness; local guidance and diner vulnerability determine whether soft yolks are appropriate.",
      "Finish with herbs and serve immediately with suitable accompaniments."
    ],
    sources: [
      source("Encyclopaedia Britannica — North African cuisine context", "https://www.britannica.com/topic/North-African-cuisine", "Regional context"),
      source("The Mediterranean Dish — Shakshuka", "https://www.themediterraneandish.com/shakshuka-recipe/", "Technique cross-check")
    ]
  })
]);

export function getReferenceRecipe(id) {
  return REFERENCE_RECIPES.find(item => item.id === String(id || "")) || null;
}

export function cloneReferenceRecipe(reference, now = new Date()) {
  if (!reference?.id) throw new Error("A reference recipe is required.");
  const clonedAt = now.toISOString();
  return Object.freeze({
    id: globalThis.crypto?.randomUUID?.() || `recipe-${Date.now().toString(36)}`,
    title: reference.title,
    summary: `${reference.subtitle}. ${reference.context}`,
    ingredients: [...reference.ingredients],
    steps: reference.steps.map((text, index) => ({ order: index + 1, text })),
    equipment: [...reference.equipment],
    tags: [...new Set([reference.tradition, reference.region, ...reference.dietary, "Reference-table clone"])],
    allergens: [...reference.allergens],
    servings: reference.servings,
    timeMinutes: reference.time,
    story: `Started from Mangrok reference “${reference.title}”. ${reference.adaptation}`,
    lineage: {
      originType: "reference-recipe",
      originId: reference.id,
      originVersion: REFERENCE_RECIPE_VERSION,
      clonedAt,
      editorialState: "reviewed-reference"
    },
    referenceSources: reference.sources.map(item => ({ ...item })),
    createdAt: clonedAt,
    updatedAt: clonedAt
  });
}

function recipe(value) {
  return Object.freeze({
    reviewState: "reviewed-reference",
    reviewedAt: "2026-08-18",
    version: REFERENCE_RECIPE_VERSION,
    ...value,
    dietary: Object.freeze(value.dietary || []),
    allergens: Object.freeze(value.allergens || []),
    equipment: Object.freeze(value.equipment || []),
    ingredients: Object.freeze(value.ingredients || []),
    steps: Object.freeze(value.steps || []),
    sources: Object.freeze((value.sources || []).map(item => Object.freeze(item)))
  });
}

function source(name, url, purpose) {
  return { name, url, purpose };
}
