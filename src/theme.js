export const THEMES = [
  { id: 'parchment', name: 'Пергамент', accent: '#d4552a', bg: '#241709', text: '#f3e7c6' },
  { id: 'arcana', name: 'Аркана', accent: '#6d9db8', bg: '#1b2029', text: '#e0e7f0' },
  { id: 'forest', name: 'Лес', accent: '#5d8a4e', bg: '#1e2919', text: '#e3ebd8' },
  { id: 'crimson', name: 'Багрянец', accent: '#b5574a', bg: '#2f1a18', text: '#f1ddda' },
  { id: 'twilight', name: 'Сумерки', accent: '#8a74b5', bg: '#221e2e', text: '#e6e2f0' },
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
