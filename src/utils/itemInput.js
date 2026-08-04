// Eingabe-Parsing + Duplikat-Erkennung für die Schnell-Hinzufügen-Zeile der
// Einkaufsliste. Gleiche Logik wie in der Android-App (ItemsScreen.kt), damit
// sich beide Apps identisch verhalten.

// Erkennt eine Zahl (Punkt ODER Komma als Dezimaltrenner) am Ende der Eingabe,
// getrennt vom Namen durch ein Leerzeichen - die Einheit direkt danach darf mit
// oder ohne Leerzeichen an der Zahl kleben ("8Stück" wie "8 Stück").
// "Paprika 8Stück" -> { name: "Paprika", quantity: "8", unit: "Stück" }
// "Tomaten 3" -> { name: "Tomaten", quantity: "3", unit: null }; sonst quantity/unit: null
// Spaltenbreiten von list_items im Backend - längere Werte laufen dort in einen
// MySQL-Fehler ("Data too long for column 'unit'").
export const MAX_QUANTITY_LEN = 50
export const MAX_UNIT_LEN = 20

export function parseItemInput(input) {
  const trimmed = (input ?? '').trim()
  const m = trimmed.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(\S.*)?$/)
  if (!m) return { name: trimmed, quantity: null, unit: null }
  const unit = m[3]?.trim() || ''
  // Passt der Teil hinter der Zahl nicht in die Einheiten-Spalte, ist es keine
  // Einheit, sondern Fließtext ("Apfelsaft 2 Flaschen aus dem Keller") - dann
  // bleibt die komplette Eingabe der Name.
  if (unit.length > MAX_UNIT_LEN) return { name: trimmed, quantity: null, unit: null }
  return { name: m[1].trim(), quantity: m[2].replace(',', '.'), unit: unit || null }
}

// Zerlegt das gemeinsame Mengen-Feld ("2 kg") wieder in quantity + unit. Beide
// Werte werden IMMER gesetzt (null = leeren), sonst bliebe beim Löschen der
// Menge die alte Einheit am Item hängen.
export function splitQuantityAndUnit(text) {
  const trimmed = (text ?? '').trim()
  const idx = trimmed.indexOf(' ')
  let quantity = idx < 0 ? trimmed : trimmed.slice(0, idx)
  let unit = idx < 0 ? '' : trimmed.slice(idx + 1).trim()
  // Zu lang für die Einheiten-Spalte? Dann ist es Freitext - alles ins
  // Mengenfeld (breitere Spalte).
  if (unit.length > MAX_UNIT_LEN) {
    quantity = trimmed
    unit = ''
  }
  return { quantity: quantity.slice(0, MAX_QUANTITY_LEN) || null, unit: unit || null }
}

export function normalizeName(s) {
  return (s ?? '').toLowerCase().trim().replace(/\s+/g, ' ')
}

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = cur
  }
  return prev[n]
}

// gleich oder "fast gleich" geschrieben (z.B. Tomate/Tomaten, Jogurt/Joghurt)
export function isSimilarName(a, b) {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return false
  if (na === nb) return true
  const threshold = Math.min(na.length, nb.length) <= 4 ? 1 : 2
  return levenshtein(na, nb) <= threshold
}

function parseQty(s) {
  const t = (s ?? '').trim().replace(',', '.')
  const m = t.match(/^(\d+(?:\.\d+)?)\s*(.*)$/)
  if (m) return { num: parseFloat(m[1]), unit: m[2].trim().toLowerCase() }
  return { num: null, unit: t.toLowerCase() }
}

function fmt(n) {
  return String(Math.round(n * 100) / 100)
}

// Führt zwei Mengen-Strings zusammen ("500 g" + "250 g" -> "750 g").
// - neuer Eintrag ohne Zahl/Einheit  -> bestehende Menge bleibt
// - bestehend leer                    -> neue Menge übernehmen
// - gleiche Einheit (auch beide leer) -> Zahlen addieren
// - verschiedene Einheiten            -> bestehende Menge bleibt (keine Falsch-Summe)
export function mergeQuantity(existing, added) {
  const ad = parseQty(added)
  if (ad.num == null && !ad.unit) return existing || null
  const ae = parseQty(existing)
  if (ae.num == null && !ae.unit) return (added ?? '').trim() || existing || null
  if (ae.unit === ad.unit) {
    const sum = (ae.num ?? 1) + (ad.num ?? 1)
    return ae.unit ? `${fmt(sum)} ${ae.unit}` : fmt(sum)
  }
  return existing
}
