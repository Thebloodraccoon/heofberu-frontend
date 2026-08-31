export const THEMES = [
  { id: 'light', name: 'Светлая', accent: '#d4552a', bg: '#3a2915', text: '#f9f0da' },
  { id: 'parchment', name: 'Тёмная тема', accent: '#d4552a', bg: '#241709', text: '#f3e7c6' },
]

const STORAGE_KEY = 'heofberu-theme'
const DEFAULT_THEME = 'light'

export function getTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function isDarkTheme(id) {
  return id === 'parchment'
}

export function applyTheme(id) {
  const theme = THEMES.some((t) => t.id === id) ? id : DEFAULT_THEME
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* localStorage недоступен — тема живёт до перезагрузки страницы */
  }
  return theme
}

export function initTheme() {
  applyTheme(getTheme())
}
