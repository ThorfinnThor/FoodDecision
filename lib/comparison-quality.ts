import { scoreByType } from "./scoring.ts";
import type { CategorySlug, Product } from "./types.ts";

export type ComparisonSide = "first" | "second" | null;
export type ComparisonMetric = "overall" | "sugar" | "protein" | "saturatedFat" | "salt";

function normalizedText(value: string) {
  return value
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function productIdentityText(product: Product) {
  return normalizedText([product.brand, product.name, ...product.labels].join(" "));
}

function productEvidenceText(product: Product) {
  return normalizedText([
    product.brand,
    product.name,
    ...product.labels,
    ...product.allergens,
    ...product.ingredients.slice(0, 12),
  ].join(" "));
}

function matches(value: string, pattern: RegExp) {
  return pattern.test(value);
}

const categoryIdentityPatterns: Record<CategorySlug, RegExp> = {
  hafermilch: /\b(oat ?milk|oatmilk|oat drink|hafermilch|hafer drink|haferdrink|barista hafer)\b/,
  proteinriegel: /\b(protein|eiweiss|high protein|bar|riegel)\b/,
  muesli: /\b(muesli|musli|granola|cruesli|porridge|oatmeal|oats?|haferflocken|cereal|flakes)\b/,
  "joghurt-skyr": /\b(yogurt|joghurt|jogurt|skyr)\b/,
  "vegane-snacks": /\b(snack|chips?|cracker|rice cake|reiswaffel|linsenwaffel|waffel|trail mix|nuts?|kerne|puffed|tortilla)\b/,
  fruehstueckscerealien: /\b(cereal|flakes|oatmeal|oats?|haferflocken|muesli|musli|granola|cruesli|shredded wheat)\b/,
  "pflanzliche-joghurts": /\b(yogurt|joghurt|jogurt|skyr|soja natur|soy natural)\b/,
  brotaufstriche: /\b(spread|aufstrich|butter|mus|crema|cream cheese|frischkase|nutella|konfiture|marmelade|jam)\b/,
  nussmuse: /\b(almond|mandel|peanut|erdnuss|hazelnut|haselnuss|cashew|pistachio|pistazie|nut butter|nussmus)\b/,
  fertiggerichte: /./,
  erfrischungsgetraenke: /\b(cola|soda|lemonade|limonade|soft drink|sparkling water|sprudel|eistee|iced tea|drink|beverage|wasser|water|juice|saft|pepsi|red bull|cockta)\b/,
  "kinder-snacks": /\b(snack|bar|riegel|cracker|flatbread|pita|applesauce|apple sauce|frucht|fruit|waffel|biscuit|keks)\b/,
  brot: /\b(bread|brot|toast|crispbread|knackebrot|knusperbrot|wrap|tortilla|muffin|loaf)\b/,
  pasta: /\b(pasta|noodle|nudel|spaghetti|fusilli|penne|rigatoni|rotini|strozzapreti|tagliatelle|linguine|macaroni)\b/,
  pastasaucen: /\b(pasta sauce|sauce|sosse|bolognese|marinara|pesto|arrabbiata|pomodoro|passata)\b/,
  suppen: /\b(soup|suppe|broth|bruhe|eintopf|stew|chili|ramen|miso|dal|soup dumpling)\b/,
  tiefkuehlgerichte: /\b(meal|bowl|chicken|pasta|penne|fish|fisch|filet|pfanne|vindaloo|alfredo|steakhouse|spatzle|lasagne|pizza)\b/,
  cracker: /\b(cracker|crispbread|knackebrot|knusperbrot|knacke|puffed cake|rice cake)\b/,
};

/** A conservative publication gate, not a replacement for source taxonomy. */
export function hasPlausibleComparisonCategory(product: Product) {
  const identity = productIdentityText(product);
  const evidence = productEvidenceText(product);

  if (
    product.category === "brotaufstriche"
    && matches(identity, /\b(korniger frischkase|cottage cheese|huttenkase|tworog|quark)\b/)
  ) return false;

  if (product.category === "pflanzliche-joghurts") {
    const plantCue = matches(evidence, /\b(vegan|plant|pflanzlich|soy|soja|oat|hafer|almond|mandel|coconut|kokos|cashew)\b/);
    const dairyCue = matches(evidence, /\b(milk|milch|cream|sahne|lactose|laktose|minusl)\b/);
    if (!plantCue || dairyCue && !matches(evidence, /\b(vegan|plant|pflanzlich)\b/)) return false;
  }

  if (product.category === "fertiggerichte") {
    if (matches(identity, /\b(soup|suppe|broth|bruhe)\b/)) return false;
    const staple = matches(identity, /\b(pasta|fusilli|penne|spaghetti|rotini|strozzapreti|couscous|matzen|plain rice|white rice|reis)\b/);
    const preparedCue = matches(identity, /\b(with|mit|meal|bowl|ready|prepared|chicken|huhn|fish|fisch|sticks|stabchen|sauce|curry|lasagne|pizza|pfanne)\b/);
    if (staple && !preparedCue) return false;
  }

  if (product.category === "erfrischungsgetraenke" && matches(identity, /\b(spray|oil|canola|rapeseed|rapsol)\b/)) {
    return false;
  }

  if (product.category === "hafermilch" && matches(evidence, /\b(hafer|oat|oatmilk|malk|barista)\b/) && product.nutrition.basis === "100ml") {
    return true;
  }

  const strictIdentityCategories = new Set<CategorySlug>([
    "hafermilch",
    "pflanzliche-joghurts",
    "pastasaucen",
  ]);
  return !strictIdentityCategories.has(product.category)
    || matches(identity, categoryIdentityPatterns[product.category]);
}

export function comparisonCohort(product: Product) {
  const text = productIdentityText(product);
  const category = product.category;
  const cohort = (name: string) => `${category}:${name}`;

  if (category === "brotaufstriche") {
    if (matches(text, /\b(almond|mandel|peanut|erdnuss|hazelnut|haselnuss|cashew|pistachio|pistazie|nut|mandelmus|erdnussmus|nussmus)\b/)) return cohort("nut");
    if (matches(text, /\b(cream cheese|frischkase)\b/)) return cohort("dairy");
    if (matches(text, /\b(chocolate|schoko|kakao|nougat)\b/)) return cohort("chocolate");
    if (matches(text, /\b(jam|marmelade|konfiture)\b/)) return cohort("fruit");
  }
  if (category === "nussmuse") {
    if (matches(text, /\b(almond|mandel)\b/)) return cohort("almond");
    if (matches(text, /\b(peanut|erdnuss)\b/)) return cohort("peanut");
    if (matches(text, /\b(cashew)\b/)) return cohort("cashew");
    if (matches(text, /\b(hazelnut|haselnuss)\b/)) return cohort("hazelnut");
  }
  if (category === "brot") {
    if (matches(text, /\b(crispbread|knackebrot|knusperbrot|knacke)\b/)) return cohort("crispbread");
    if (matches(text, /\b(wrap|tortilla)\b/)) return cohort("wrap");
    if (matches(text, /\b(muffin)\b/)) return cohort("muffin");
    return cohort("loaf");
  }
  if (category === "fruehstueckscerealien") {
    if (matches(text, /\b(oatmeal|oats?|haferflocken)\b/)) return cohort("oats");
    if (matches(text, /\b(granola|cruesli|crunchy)\b/)) return cohort("granola");
    if (matches(text, /\b(porridge)\b/)) return cohort("porridge");
    return cohort("cereal");
  }
  if (category === "vegane-snacks") {
    if (matches(text, /\b(chips?|tortilla)\b/)) return cohort("chips");
    if (matches(text, /\b(cracker|rice cake|reiswaffel|linsenwaffel|waffel|maissnack)\b/)) return cohort("crisp");
    if (matches(text, /\b(nut|kerne|trail mix|fava)\b/)) return cohort("nuts-seeds");
  }
  if (category === "kinder-snacks") {
    if (matches(text, /\b(applesauce|apple sauce|frucht|fruit)\b/)) return cohort("fruit");
    if (matches(text, /\b(bar|riegel)\b/)) return cohort("bar");
    if (matches(text, /\b(cracker|flatbread|pita|biscuit|keks)\b/)) return cohort("cracker");
  }
  if (category === "fertiggerichte" || category === "tiefkuehlgerichte") {
    if (matches(text, /\b(fish|fisch|lachs|filet|stabchen|sticks)\b/)) return cohort("fish");
    if (matches(text, /\b(pasta|penne|spaghetti|strozzapreti|alfredo|spatzle|gorgonzola)\b/)) return cohort("pasta");
    if (matches(text, /\b(rice|reis|couscous|bowl)\b/)) return cohort("grain-bowl");
    if (matches(text, /\b(chicken|huhn|vindaloo)\b/)) return cohort("meat-meal");
  }
  return cohort("general");
}

export function comparisonProductLabel(product: Product) {
  const name = product.name.trim();
  const brand = product.brand.trim();
  const normalizedName = normalizedText(name);
  const normalizedBrand = normalizedText(brand);
  return normalizedBrand && normalizedName.includes(normalizedBrand) ? name : `${brand} ${name}`.trim();
}

export function hasDistinctComparisonIdentity(first: Product, second: Product) {
  return normalizedText(comparisonProductLabel(first)) !== normalizedText(comparisonProductLabel(second));
}

const thresholds: Record<ComparisonMetric, number> = {
  overall: 3,
  sugar: 0.5,
  protein: 1,
  saturatedFat: 0.5,
  salt: 0.1,
};

export function comparisonMetricSide(
  firstValue: number | null,
  secondValue: number | null,
  metric: ComparisonMetric,
): ComparisonSide {
  if (firstValue === null || secondValue === null) return null;
  const difference = firstValue - secondValue;
  if (Math.abs(difference) < thresholds[metric]) return null;
  const lowerIsBetter = metric === "sugar" || metric === "saturatedFat" || metric === "salt";
  if (lowerIsBetter) return difference < 0 ? "first" : "second";
  return difference > 0 ? "first" : "second";
}

export function meaningfulComparisonDifferenceCount(first: Product, second: Product) {
  const differences = [
    comparisonMetricSide(scoreByType(first, "overall_match")?.score ?? null, scoreByType(second, "overall_match")?.score ?? null, "overall"),
    comparisonMetricSide(first.nutrition.sugar, second.nutrition.sugar, "sugar"),
    comparisonMetricSide(first.nutrition.protein, second.nutrition.protein, "protein"),
    comparisonMetricSide(first.nutrition.saturatedFat, second.nutrition.saturatedFat, "saturatedFat"),
    comparisonMetricSide(first.nutrition.salt, second.nutrition.salt, "salt"),
  ].filter(Boolean).length;
  const energyDifference = first.nutrition.energyKcal !== null && second.nutrition.energyKcal !== null
    && Math.abs(first.nutrition.energyKcal - second.nutrition.energyKcal) >= 20 ? 1 : 0;
  const firstIngredients = first.ingredients.map(normalizedText).join("|");
  const secondIngredients = second.ingredients.map(normalizedText).join("|");
  const ingredientDifference = firstIngredients && secondIngredients && firstIngredients !== secondIngredients ? 1 : 0;
  return differences + energyDifference + ingredientDifference;
}

export function isPreparedComparisonPair(first: Product, second: Product) {
  return areComparisonPeers(first, second)
    && hasDistinctComparisonIdentity(first, second)
    && meaningfulComparisonDifferenceCount(first, second) >= 2;
}

export function areComparisonPeers(first: Product, second: Product) {
  return first.slug !== second.slug
    && first.locale === second.locale
    && first.category === second.category
    && first.nutrition.basis === second.nutrition.basis
    && hasPlausibleComparisonCategory(first)
    && hasPlausibleComparisonCategory(second)
    && comparisonCohort(first) === comparisonCohort(second);
}
