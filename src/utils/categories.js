// Einkaufs-Kategorien (iconKeys) in supermarkttypischer Default-Reihenfolge.
// Gleiche Reihenfolge wie in der Android-App (ItemsScreen.kt).
export const SHOPPING_CATEGORIES = [
  'fruit_veg', 'bakery', 'dairy', 'meat_fish', 'frozen',
  'sweets', 'drinks', 'household', 'drugstore', 'other',
]

// Gespeicherte Reihenfolge (JSON-String der iconKeys) zu einer gültigen,
// vollständigen Reihenfolge auflösen: unbekannte raus, fehlende hinten anhängen.
export function resolveCategoryOrder(stored) {
  let order = []
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) order = parsed
    } catch { /* ungültig → Default */ }
  }
  order = order.filter((k) => SHOPPING_CATEGORIES.includes(k))
  for (const k of SHOPPING_CATEGORIES) if (!order.includes(k)) order.push(k)
  return order
}
