// Theme-Verwaltung: 'system' (Standard) folgt der Geräteeinstellung,
// 'light' / 'dark' erzwingen ein Schema. Wahl liegt in localStorage.
// Das initiale Setzen der .dark-Klasse passiert FOUC-frei im Inline-Skript
// in index.html; dieses Modul übernimmt Laufzeit-Änderungen + System-Updates.

const KEY = 'theme'
const mq = window.matchMedia('(prefers-color-scheme: dark)')

export function getTheme() {
  return localStorage.getItem(KEY) || 'system'
}

export function isDark(pref = getTheme()) {
  return pref === 'dark' || (pref === 'system' && mq.matches)
}

export function applyTheme(pref = getTheme()) {
  const dark = isDark(pref)
  document.documentElement.classList.toggle('dark', dark)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#0e1620' : '#0050AA')
}

export function setTheme(pref) {
  if (pref === 'system') localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, pref)
  applyTheme(pref)
}

// Bei Systemwechsel nur reagieren, wenn der Nutzer "System" gewählt hat
mq.addEventListener('change', () => {
  if (getTheme() === 'system') applyTheme('system')
})

applyTheme()
