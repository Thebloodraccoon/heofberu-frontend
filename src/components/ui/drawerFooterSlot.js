import { createContext } from 'react'

// Подвал ближайшего Drawer для DrawerFooter: null — не внутри панели (или внутри
// Modal, открытой из панели: Modal сбрасывает его); { slot: null } — внутри панели,
// но её подвал ещё не смонтирован; { slot } — узел подвала.
export const FooterSlotContext = createContext(null)
