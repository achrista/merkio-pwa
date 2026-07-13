// Einkaufs-Kategorien (iconKeys) in supermarkttypischer Default-Reihenfolge.
// Gleiche Reihenfolge wie in der Android-App (ItemsScreen.kt).
export const SHOPPING_CATEGORIES = [
  'fruit_veg', 'bakery', 'dairy', 'meat_fish', 'frozen',
  'sweets', 'drinks', 'household', 'drugstore', 'other',
]

// To-do-Kategorien (iconKeys des Backends, TODO_ICON_KEYS in categorize.js).
export const TODO_CATEGORIES = [
  'personal', 'work', 'home_todo', 'health', 'finance',
  'transport', 'communication', 'creative', 'learning', 'other_todo',
]

// Gespeicherte Reihenfolge (JSON-String der iconKeys) zu einer gültigen,
// vollständigen Reihenfolge auflösen: unbekannte raus, fehlende hinten anhängen.
// group_settings.category_order enthält Shopping- UND To-do-Keys gemischt;
// `valid` filtert auf den Satz des aktuellen Listentyps.
export function resolveCategoryOrder(stored, valid = SHOPPING_CATEGORIES) {
  let order = []
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) order = parsed
    } catch { /* ungültig → Default */ }
  }
  order = order.filter((k) => valid.includes(k))
  for (const k of valid) if (!order.includes(k)) order.push(k)
  return order
}

// Neue Reihenfolge eines Typs speichern, ohne die des anderen Typs zu verlieren.
export function mergeCategoryOrder(stored, newOrder, valid) {
  let others = []
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) others = parsed.filter((k) => !valid.includes(k))
    } catch { /* ungültig → verwerfen */ }
  }
  return JSON.stringify([...others, ...newOrder])
}
