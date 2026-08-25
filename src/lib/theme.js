export const THEMES = [
  { id: 'parchment', name: 'Пергамент', accent: '#d4552a', bg: '#241709', text: '#f3e7c6' },
  { id: 'arcana', name: 'Тёмная тема', accent: '#6d9db8', bg: '#1b2029', text: '#e0e7f0' },
  { id: 'light', name: 'Светлая', accent: '#d4552a', bg: '#3a2915', text: '#f9f0da' },
]

const STORAGE_KEY = 'heofberu-theme'
const DEFAULT_THEME = 'parchment'

export function getTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
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
