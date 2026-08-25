#!/usr/bin/env python3
import argparse, hashlib, json, pathlib, re, unicodedata
VERSION='2026.08.13-global-granular-v2'; TARGET=4301
CUISINES='Global|Afghan|Algerian|Amazonian|American|Andean|Angolan|Arabian Gulf|Argentine|Armenian|Australian Indigenous|Austrian|Bangladeshi|Basque|Belgian|Beninese|Bolivian|Brazilian|British|Burmese|Cajun and Creole|Cambodian|Cameroonian|Canadian|Caribbean|Chilean|Chinese|Colombian|Congolese|Croatian|Cuban|Danish|Ecuadorian|Egyptian|Ethiopian|Filipino|Finnish|French|Georgian|German|Ghanaian|Greek|Guatemalan|Haitian|Hawaiian|Hungarian|Icelandic|Indian|Indigenous North American|Indonesian|Iranian|Iraqi|Irish|Israeli|Italian|Ivorian|Jamaican|Japanese|Jewish Ashkenazi|Jewish Sephardi|Jordanian|Kazakh|Kenyan|Korean|Laotian|Lebanese|Malaysian|Mexican|Mongolian|Moroccan|Nepalese|New Zealand Maori|Nigerian|Nordic|Pakistani|Palestinian|Peruvian|Polish|Portuguese|Russian|Senegalese|South African|Sri Lankan|Syrian|Thai|Tibetan|Turkish|Ukrainian|Uzbek|Venezuelan|Vietnamese|West African'.split('|')
# name|category|aliases|cuisines|regions|parts|processes|forms|rarity|notes
RARE=r'''Koji rice|Fermentation starters|kome koji;rice koji|Japanese|East Asia|grain|cultured;fermented|whole|heritage|Aspergillus oryzae rice culture
Nuruk|Fermentation starters|Korean fermentation starter|Korean|East Asia|grain|cultured;fermented|cake|heritage|Mixed cereal starter
Qu starter|Fermentation starters|jiuqu|Chinese|East Asia|grain|cultured;fermented|cake|heritage|Traditional grain starter
Ragi tapai|Fermentation starters|ragi tape|Indonesian;Malaysian|Southeast Asia|grain|cultured;fermented|cake|heritage|Mixed microbial starter
Kefir grains|Fermentation starters|milk kefir grains|Turkish;Global|West Asia||cultured|granules|heritage|Symbiotic culture
Kombucha SCOBY|Fermentation starters|kombucha mother|Chinese;Global|East Asia||cultured|pellicle|heritage|Tea culture
Sourdough mother|Fermentation starters|levain starter;lievito madre|French;Italian;Global|Europe|grain|cultured;fermented|starter|heritage|Wild culture
Enset kocho|Roots tubers and plant parts|kocho|Ethiopian|East Africa|pseudostem;leaf sheath|fermented|paste|heritage|Fermented enset starch
Enset bulla|Roots tubers and plant parts|bulla|Ethiopian|East Africa|pseudostem|extracted;dried|starch|heritage|Refined enset starch
Baobab leaf|Leaves and greens|lalo|West African|Africa|leaf|dried;powdered|powder|heritage|Thickening leaf
Cassava leaves|Leaves and greens|saka-saka;pondu|Congolese;West African|Africa|leaf|pounded;cooked|paste|heritage|Requires proper processing
Banana blossom|Flowers and floral ingredients|banana heart|Filipino;Thai;Vietnamese;Indian|Southeast Asia|flower|fresh|whole|regional|Edible inflorescence
Torch ginger flower|Flowers and floral ingredients|bunga kantan|Malaysian;Indonesian|Southeast Asia|flower|fresh|whole|heritage|Aromatic flower
Water spinach|Leaves and greens|kangkong;ong choy|Filipino;Vietnamese;Chinese;Thai|Southeast Asia|leaf;stem|fresh|whole|regional|Aquatic green
Nettles|Foraged ingredients|stinging nettle|British;Nordic|Europe|leaf|blanched|whole|foraged|Handle and cook properly
Fiddlehead ferns|Foraged ingredients|fiddleheads|Canadian;Indigenous North American|North America|shoot|blanched|whole|foraged|Young fern fronds
Ramps|Foraged ingredients|wild leeks|Indigenous North American;American|North America|leaf;bulb|fresh|whole|foraged|Wild allium
Samphire|Foraged ingredients|sea asparagus;glasswort|British;French|Europe|shoot|fresh|whole|foraged|Coastal plant
Spruce tips|Foraged ingredients|spruce shoots|Nordic;Canadian|Northern regions|shoot|fresh|whole|foraged|Young conifer tips
Fonio|Heritage grains nuts and seeds|acha;iburu|West African|Africa|seed|hulled|grain|heritage|Small grain
Teff|Heritage grains nuts and seeds|tef|Ethiopian|East Africa|seed|ground|grain|heritage|Ancient cereal
Finger millet|Heritage grains nuts and seeds|ragi;mandua|Indian;East African|South Asia;Africa|seed|ground|grain|heritage|Minor millet
Kañiwa|Heritage grains nuts and seeds|cañihua|Andean;Peruvian;Bolivian|Andes|seed|hulled|grain|heritage|Andean pseudocereal
Tarwi|Legumes|Andean lupin|Peruvian;Bolivian|Andes|seed|debittered|whole|heritage|Requires debittering
Chuño|Roots tubers and plant parts|freeze-dried potato|Andean;Peruvian;Bolivian|Andes|tuber|freeze-dried|whole|heritage|Traditional preservation
Iru|Fermented condiments|locust bean seasoning;dawadawa|Nigerian;West African|West Africa|seed|fermented|cakes|heritage|Fermented Parkia seeds
Ugba|Fermented condiments|ukpaka|Nigerian|West Africa|seed|fermented;sliced|strips|heritage|African oil bean
Huitlacoche|Fungi|corn smut;cuitlacoche|Mexican|Latin America|fungus|fresh;preserved|whole|heritage|Edible corn fungus
Keluak|Nuts and seeds|kluwak;buah keluak|Indonesian;Malaysian|Southeast Asia|seed|fermented|whole|heritage|Requires expert processing
Black lime|Spices and aromatics|loomi;dried lime|Arabian Gulf;Iraqi;Iranian|Middle East|fruit|dried|whole|heritage|Dried citrus
Mastic|Spices and aromatics|mastiha|Greek;Turkish;Lebanese|Mediterranean|resin|dried|tears|heritage|Pistacia resin
Tucupi|Fermented condiments|manioc broth|Amazonian;Brazilian|Amazon|root juice|fermented;cooked|liquid|heritage|Processed cassava liquid
Wattleseed|Nuts and seeds|acacia seed|Australian Indigenous|Australia|seed|roasted;ground|powder|heritage|Edible Acacia seeds'''
MAP={'Vegetables and Vegetable Products':'Vegetables and greens','Fruits and Fruit Juices':'Fruit','Spices and Herbs':'Spices and aromatics','Legumes and Legume Products':'Legumes','Nut and Seed Products':'Nuts and seeds','Cereal Grains and Pasta':'Grains and cereals','Dairy and Egg Products':'Dairy and eggs','Fats and Oils':'Oils and fats','Finfish and Shellfish Products':'Fish and shellfish','Poultry Products':'Poultry','Pork Products':'Pork','Beef Products':'Beef','Lamb, Veal, and Game Products':'Lamb veal and game','Soups, Sauces, and Gravies':'Sauces stocks and condiments','Beverages':'Beverages','Sweets':'Sweeteners and confectionery','American Indian/Alaska Native Foods':'Indigenous North American ingredients'}
SKIP=re.compile(r'\b(restaurants?|fast foods?|babyfood|school lunch|meal replacement|formula|tv dinner|sandwich|pizza|burger|burrito|lasagna|casserole|cookie|cake|pie|candy|snack)\b',re.I)
PARTS='leaf leaves root seed flower blossom peel rind bark stem shoot bulb tuber pod pulp juice oil liver kidney heart blood roe milk whey curd skin bone fat'.split(); PROCS='raw boiled baked roasted dried dehydrated smoked fermented pickled canned frozen salted cured sprouted toasted ground powdered concentrated pressed extracted cooked steamed'.split(); FORMS='whole sliced chopped diced minced flour meal powder paste juice oil butter milk cream sauce syrup broth stock puree'.split()
def norm(s):return re.sub(r'[^a-z0-9]+',' ',unicodedata.normalize('NFKD',str(s or '')).encode('ascii','ignore').decode().lower()).strip()
def uniq(xs):
 out=[];seen=set()
 for x in xs:
  x=str(x or '').strip();k=norm(x)
  if x and k not in seen:seen.add(k);out.append(x)
 return out
def slug(s):return 'ing-'+(norm(s).replace(' ','-')[:65] or 'item')+'-'+hashlib.sha1(s.encode()).hexdigest()[:7]
def allergens(n):
 s=' '+norm(n)+' '; out=[]
 for label,pat in [('dairy',r'\b(milk|cheese|butter|cream|whey|casein|yogurt)\b'),('egg',r'\beggs?\b'),('gluten',r'\b(wheat|barley|rye|spelt|einkorn|emmer|farro|seitan)\b'),('peanut',r'\bpeanuts?\b'),('soy',r'\b(soy|tofu|tempeh|miso|edamame)\b'),('sesame',r'\bsesame\b'),('fish',r'\b(fish|salmon|tuna|cod|anchovy|sardine|trout|mackerel)\b'),('shellfish',r'\b(shrimp|prawn|crab|lobster|clam|mussel|oyster|scallop|squid|octopus)\b'),('tree-nut',r'\b(almond|walnut|cashew|pistachio|pecan|hazelnut|macadamia|brazil nut)\b'),('mustard',r'\bmustard\b')]:
  if re.search(pat,s):out.append(label)
 return out
def dietary(cat):
 if cat in {'Fish and shellfish','Poultry','Pork','Beef','Lamb veal and game'}:return []
 return ['vegetarian'] if cat=='Dairy and eggs' else ['vegan','vegetarian']
def rare_rows():
 out=[]
 for line in RARE.splitlines():
  a=(line.split('|')+['']*10)[:10]; name,cat,aliases,cuisines,regions,parts,procs,forms,rarity,notes=a
  out.append({'id':slug(name),'name':name,'category':cat,'aliases':uniq(aliases.split(';')),'cuisines':uniq(cuisines.split(';')),'regions':uniq(regions.split(';')),'tags':['granular heritage research'],'parts':uniq(parts.split(';')),'processes':uniq(procs.split(';')),'forms':uniq(forms.split(';')),'allergens':allergens(name),'dietary':dietary(cat),'rarity':rarity,'status':'published','source':'Mangrok granular culinary research','sourceId':'','sourceLicense':'curated metadata','notes':notes})
 return out
def foods(roots):
 for root in roots:
  for p in pathlib.Path(root).rglob('*.json'):
   try:d=json.loads(p.read_text(encoding='utf-8-sig'))
   except:continue
   rows=d if isinstance(d,list) else next((d[k] for k in ('FoundationFoods','SRLegacyFoods','foods') if isinstance(d.get(k),list)),[])
   for r in rows:
    if not isinstance(r,dict):continue
    desc=str(r.get('description') or r.get('name') or '').strip(); c=r.get('foodCategory') or r.get('category'); c=c.get('description') if isinstance(c,dict) else str(c or '')
    if desc and c in MAP and not SKIP.search(desc):yield desc,c,str(r.get('fdcId') or '')
def row(desc,c,fdc):
 bits=[x.strip() for x in desc.split(',') if x.strip()]; base=bits[0]; qs=[x for x in bits[1:] if x.lower() not in {'raw','cooked'}][:3]; name=(' '.join(qs+[base]) if qs else base)[:110]; toks=norm(desc).split(); cat=MAP[c]; aliases=uniq([desc,base,re.sub(r',\s*(raw|cooked|boiled|baked|roasted|dried|canned|frozen).*','',desc,flags=re.I)])
 return {'id':slug(name+'|'+fdc),'name':name,'category':cat,'aliases':aliases,'cuisines':['Global'],'regions':['United States reference'],'tags':['USDA reference'],'parts':[x for x in PARTS if x in toks],'processes':[x for x in PROCS if x in toks],'forms':[x for x in FORMS if x in toks],'allergens':allergens(name),'dietary':dietary(cat),'rarity':'reference','status':'published','source':'USDA FoodData Central','sourceId':fdc,'sourceLicense':'CC0/public domain','notes':''}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',action='append',default=[]);ap.add_argument('--output',required=True);ap.add_argument('--stats',required=True);a=ap.parse_args(); out=rare_rows();seen={norm(x['name']) for x in out}; candidates=[]
 for desc,c,fdc in foods(a.root):
  x=row(desc,c,fdc);k=norm(x['name'])
  if k in seen or len(k)<2:continue
  score=20*bool(x['parts'])+12*bool(x['processes'])+8*bool(x['forms']);candidates.append((score,x))
 for _,x in sorted(candidates,key=lambda z:(-z[0],z[1]['category'],z[1]['name'].lower())):
  k=norm(x['name'])
  if k in seen:continue
  seen.add(k);out.append(x)
  if len(out)>=TARGET:break
 if len(out)<TARGET:raise SystemExit(f'only {len(out)}')
 out=out[:TARGET]
 for i,x in enumerate(out):x['visualIndex']=i
 cats=sorted({x['category'] for x in out});regs=sorted({v for x in out for v in x['regions']});stats={'version':VERSION,'count':len(out),'categories':len(cats),'cuisines':len(CUISINES),'regions':len(regs),'aliases':sum(len(x['aliases']) for x in out),'sources':sorted({x['source'] for x in out})}
 js='// Generated from reviewed granular curation and USDA FoodData Central.\n'+f'export const INGREDIENT_CATALOG_VERSION={json.dumps(VERSION)};\n'+f'export const INGREDIENT_CATALOG_STATS=Object.freeze({json.dumps(stats,separators=(",",":"))});\n'+f'export const INGREDIENT_CATEGORIES=Object.freeze({json.dumps(cats,separators=(",",":"))});\n'+f'export const INGREDIENT_CUISINES=Object.freeze({json.dumps(CUISINES,separators=(",",":"))});\n'+f'export const INGREDIENT_REGIONS=Object.freeze({json.dumps(regs,separators=(",",":"))});\n'+f'export const INGREDIENT_ALLERGENS=Object.freeze({json.dumps(sorted({v for x in out for v in x["allergens"]}),separators=(",",":"))});\n'+f'export const INGREDIENT_CATALOG=Object.freeze({json.dumps(out,ensure_ascii=False,separators=(",",":"))});\n'
 pathlib.Path(a.output).write_text(js,encoding='utf-8');pathlib.Path(a.stats).write_text(json.dumps(stats,indent=2),encoding='utf-8');print(json.dumps(stats))
if __name__=='__main__':main()
