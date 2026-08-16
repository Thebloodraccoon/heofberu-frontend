import request from '@/lib/api/httpClient.js'

export const charactersApi = {
  list: (params) => request('/api/characters', { params }),
  create: (body) => request('/api/characters', { method: 'POST', body }),
  get: (id) => request(`/api/characters/${id}`),
  update: (id, body) => request(`/api/characters/${id}`, { method: 'PATCH', body }),
  remove: (id) => request(`/api/characters/${id}`, { method: 'DELETE' }),
  hp: (id, body) => request(`/api/characters/${id}/hp`, { method: 'PATCH', body }),
  rest: (id, body) => request(`/api/characters/${id}/rest`, { method: 'POST', body }),
  skills: (id, body) => request(`/api/characters/${id}/skills`, { method: 'PUT', body }),
  savingThrows: (id, body) =>
    request(`/api/characters/${id}/saving-throws`, { method: 'PUT', body }),
  spellSlots: {
    list: (id) => request(`/api/characters/${id}/spell-slots`),
    update: (id, body) => request(`/api/characters/${id}/spell-slots`, { method: 'PATCH', body }),
  },
  spells: {
    list: (id) => request(`/api/characters/${id}/spells`),
    add: (id, body) => request(`/api/characters/${id}/spells`, { method: 'POST', body }),
    remove: (id, spellId) =>
      request(`/api/characters/${id}/spells/${spellId}`, { method: 'DELETE' }),
  },
  attacks: {
    list: (id) => request(`/api/characters/${id}/attacks`),
    add: (id, body) => request(`/api/characters/${id}/attacks`, { method: 'POST', body }),
    update: (id, attackId, body) =>
      request(`/api/characters/${id}/attacks/${attackId}`, { method: 'PATCH', body }),
    remove: (id, attackId) =>
      request(`/api/characters/${id}/attacks/${attackId}`, { method: 'DELETE' }),
  },
  feats: {
    list: (id) => request(`/api/characters/${id}/feats`),
    add: (id, body) => request(`/api/characters/${id}/feats`, { method: 'POST', body }),
    update: (id, charFeatId, body) =>
      request(`/api/characters/${id}/feats/${charFeatId}`, { method: 'PATCH', body }),
    remove: (id, charFeatId) =>
      request(`/api/characters/${id}/feats/${charFeatId}`, { method: 'DELETE' }),
  },
  features: {
    list: (id) => request(`/api/characters/${id}/features`),
    add: (id, body) => request(`/api/characters/${id}/features`, { method: 'POST', body }),
    update: (id, charFeatureId, body) =>
      request(`/api/characters/${id}/features/${charFeatureId}`, { method: 'PATCH', body }),
    remove: (id, charFeatureId) =>
      request(`/api/characters/${id}/features/${charFeatureId}`, { method: 'DELETE' }),
  },
  items: {
    list: (id) => request(`/api/characters/${id}/items`),
    add: (id, body) => request(`/api/characters/${id}/items`, { method: 'POST', body }),
    update: (id, charItemId, body) =>
      request(`/api/characters/${id}/items/${charItemId}`, { method: 'PATCH', body }),
    remove: (id, charItemId) =>
      request(`/api/characters/${id}/items/${charItemId}`, { method: 'DELETE' }),
  },
  conditions: {
    list: (id) => request(`/api/characters/${id}/conditions`),
    add: (id, body) => request(`/api/characters/${id}/conditions`, { method: 'POST', body }),
    update: (id, condition, body) =>
      request(`/api/characters/${id}/conditions/${condition}`, { method: 'PATCH', body }),
    remove: (id, condition) =>
      request(`/api/characters/${id}/conditions/${condition}`, { method: 'DELETE' }),
  },
  progression: {
    race: (id, body) =>
      request(`/api/characters/${id}/progression/race`, { method: 'PATCH', body }),
    class: (id, body) =>
      request(`/api/characters/${id}/progression/class`, { method: 'PATCH', body }),
    subclass: (id, body) =>
      request(`/api/characters/${id}/progression/subclass`, { method: 'PATCH', body }),
    subrace: (id, body) =>
      request(`/api/characters/${id}/progression/subrace`, { method: 'PATCH', body }),
    levelUp: (id, body) =>
      request(`/api/characters/${id}/progression/level-up`, { method: 'POST', body }),
    asiChoices: (id) => request(`/api/characters/${id}/progression/asi-choices`),
  },
}
