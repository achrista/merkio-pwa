// Rezepte (Listentyp "recipes"). Ein Rezept ist ein Listeneintrag: name = Titel,
// category = Kategorie-Schlüssel, content = JSON in der gegliederten Form von Culinolas
// recipe-import (siehe backend/src/recipes/model.js).

// Reihenfolge wie im Backend (recipes/categories.js) – so ist auch die Rezeptliste sortiert.
export const RECIPE_CATEGORIES = [
  'cakes', 'pastries', 'bread', 'dessert', 'main', 'side', 'soup',
  'salad', 'starter', 'sauce', 'breakfast', 'drink', 'other',
]

export const RECIPE_CATEGORY_ICONS = {
  cakes: '🍰', pastries: '🍪', bread: '🍞', dessert: '🍮', main: '🍽️', side: '🥔', soup: '🍲',
  salad: '🥗', starter: '🥨', sauce: '🫙', breakfast: '🍳', drink: '🥤', other: '📖',
}

// Warengruppen der Einkaufsliste, aus denen eine Zutat ihre bekommt
export const INGREDIENT_ICON_KEYS = [
  'fruit_veg', 'meat_fish', 'drinks', 'dairy', 'frozen', 'bakery', 'sweets', 'household', 'drugstore', 'other',
]

export function emptyContent() {
  return {
    v: 1, description: null, tags: [], time: null, servings: null, portions: null,
    ingredients: [], steps: [], notes: [], source: { label: null, url: null, file: null },
  }
}

/** Inhalt eines Rezepts aus dem Listeneintrag; Unlesbares ergibt ein leeres Rezept. */
export function parseRecipe(item) {
  let raw = {}
  try {
    const value = JSON.parse(item?.content || '{}')
    if (value && typeof value === 'object' && !Array.isArray(value)) raw = value
  } catch { /* leer */ }
  const base = emptyContent()
  return {
    ...base,
    ...raw,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients.map((g) => ({ title: g?.title ?? null, items: Array.isArray(g?.items) ? g.items : [] })) : [],
    steps: Array.isArray(raw.steps) ? raw.steps.map((g) => ({ title: g?.title ?? null, steps: Array.isArray(g?.steps) ? g.steps : [] })) : [],
    notes: Array.isArray(raw.notes) ? raw.notes : [],
    source: { ...base.source, ...(raw.source && typeof raw.source === 'object' ? raw.source : {}) },
  }
}

export function categoryLabel(t, key) {
  if (!key) return t('recipes.cat_other')
  return RECIPE_CATEGORIES.includes(key) ? t(`recipes.cat_${key}`) : key
}

// Ganze Zahlen ab 10, darunter eine Nachkommastelle – so rundet auch das Backend.
function round(value) {
  return String(value >= 10 ? Math.round(value) : Math.round(value * 10) / 10)
}

/** Rechnet eine Menge um: "250" → "375", "1-2" → "1.5-3"; Unlesbares bleibt stehen. */
export function scaleQuantity(quantity, factor) {
  if (!quantity || factor === 1) return quantity ?? null
  const parts = String(quantity).split('-').map(Number)
  return parts.some((part) => !Number.isFinite(part)) ? quantity : parts.map((part) => round(part * factor)).join('-')
}

const FRACTIONS = { '0.5': '½', '0.25': '¼', '0.75': '¾', '0.33': '⅓', '0.333': '⅓', '0.66': '⅔', '0.67': '⅔', '0.125': '⅛' }

/** Menge, wie man sie im Rezept liest: "0.5" → "½", "1.5" → "1,5", "1-2" → "1–2". */
export function formatQuantity(quantity, lang = 'de') {
  if (!quantity) return ''
  const decimal = lang === 'en' ? '.' : ','
  return String(quantity).split('-').map((part) => FRACTIONS[part.trim()] ?? part.trim().replace('.', decimal)).join('–')
}

export function formatAmount(ingredient, factor, lang) {
  return [formatQuantity(scaleQuantity(ingredient.quantity, factor), lang), ingredient.unit ?? ''].filter(Boolean).join(' ')
}

/**
 * Die Zutaten als Einträge für die Einkaufsliste, umgerechnet mit `factor`. Gleiche
 * Zutaten aus mehreren Abschnitten werden zusammengefasst (wie Culinolas toShoppingItems).
 */
export function toShoppingItems(content, factor = 1) {
  const byName = new Map()
  for (const ingredient of content.ingredients.flatMap((group) => group.items)) {
    if (!ingredient?.name) continue
    const item = {
      name: ingredient.name,
      quantity: ingredient.quantity ? scaleQuantity(ingredient.quantity, factor) : null,
      unit: ingredient.unit || null,
      iconKey: ingredient.iconKey || 'other',
    }
    const key = item.name.toLowerCase()
    const known = byName.get(key)
    if (!known) { byName.set(key, item); continue }
    const sum = Number(known.quantity) + Number(item.quantity)
    const sameUnit = (known.unit ?? '').toLowerCase() === (item.unit ?? '').toLowerCase()
    if (sameUnit && known.quantity && item.quantity && Number.isFinite(sum)) known.quantity = String(Math.round(sum * 100) / 100)
  }
  return [...byName.values()]
}

/** Alle Markierungen einer Rezeptliste: Herkunft und Stichworte, ohne Doppelte, sortiert. */
export function collectLabels(recipes) {
  const seen = new Map()
  for (const { content } of recipes) {
    for (const label of [content.source.label, ...content.tags]) {
      if (label && !seen.has(label.toLowerCase())) seen.set(label.toLowerCase(), label)
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

/** Rezepte nach Kategorie gegliedert, darin nach Titel – die "sortierte Ablage". */
export function groupByCategory(recipes) {
  const groups = new Map()
  for (const recipe of recipes) {
    const key = recipe.item.category || 'other'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(recipe)
  }
  const order = (key) => (RECIPE_CATEGORIES.includes(key) ? RECIPE_CATEGORIES.indexOf(key) : RECIPE_CATEGORIES.length - 1.5)
  return [...groups.entries()]
    .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
    .map(([key, list]) => ({ key, recipes: list.sort((a, b) => a.item.name.localeCompare(b.item.name)) }))
}

/** Sucht in Titel, Stichworten, Herkunft und Zutaten. */
export function matchesSearch({ item, content }, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [item.name, content.source.label, ...content.tags, ...content.ingredients.flatMap((g) => g.items.map((i) => i.name))]
  return haystack.some((text) => text && String(text).toLowerCase().includes(q))
}
