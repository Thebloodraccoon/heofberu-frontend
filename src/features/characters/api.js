import request from '@/lib/api/httpClient.js'

export const charactersApi = {
  list: (params) => request('/api/characters', { params }),
  create: (body) => request('/api/characters', { method: 'POST', body }),
  get: (id) => request(`/api/characters/${id}`),
  update: (id, body) => request(`/api/characters/${id}`, { method: 'PATCH', body }),
  remove: (id) => request(`/api/characters/${id}`, { method: 'DELETE' }),
  hp: (id, body) => request(`/api/characters/${id}/hp`, { method: 'PATCH', body }),
  rest: (id, body) => request(`/api/characters/${id}/rest`, { method: 'POST', body }),
  gmPanel: {
    stats: (id) => request(`/api/characters/${id}/gm-panel/stats`),
    maxHp: (id, body) =>
      request(`/api/characters/${id}/gm-panel/max-hp`, { method: 'PATCH', body }),
    maxLevel: {
      get: (id) => request(`/api/characters/${id}/gm-panel/max-level`),
      set: (id, body) =>
        request(`/api/characters/${id}/gm-panel/max-level`, { method: 'PATCH', body }),
    },
    asi: {
      list: (id) => request(`/api/characters/${id}/gm-panel/asi`),
      add: (id, body) => request(`/api/characters/${id}/gm-panel/asi`, { method: 'POST', body }),
      remove: (id, adjustmentId) =>
        request(`/api/characters/${id}/gm-panel/asi/${adjustmentId}`, { method: 'DELETE' }),
    },
    skills: {
      setExpertise: (id, skillId, body) =>
        request(`/api/characters/${id}/gm-panel/skills/${skillId}`, { method: 'PATCH', body }),
    },
    feats: {
      add: (id, body) => request(`/api/characters/${id}/gm-panel/feats`, { method: 'POST', body }),
      update: (id, charFeatId, body) =>
        request(`/api/characters/${id}/gm-panel/feats/${charFeatId}`, { method: 'PATCH', body }),
      remove: (id, charFeatId) =>
        request(`/api/characters/${id}/gm-panel/feats/${charFeatId}`, { method: 'DELETE' }),
    },
    features: {
      add: (id, body) => request(`/api/characters/${id}/gm-panel/features`, { method: 'POST', body }),
      update: (id, charFeatureId, body) =>
        request(`/api/characters/${id}/gm-panel/features/${charFeatureId}`, { method: 'PATCH', body }),
      remove: (id, charFeatureId) =>
        request(`/api/characters/${id}/gm-panel/features/${charFeatureId}`, { method: 'DELETE' }),
    },
    items: {
      list: (id) => request(`/api/characters/${id}/gm-panel/items`),
      add: (id, body) => request(`/api/characters/${id}/gm-panel/items`, { method: 'POST', body }),
      update: (id, charItemId, body) =>
        request(`/api/characters/${id}/gm-panel/items/${charItemId}`, { method: 'PATCH', body }),
      remove: (id, charItemId) =>
        request(`/api/characters/${id}/gm-panel/items/${charItemId}`, { method: 'DELETE' }),
    },
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
  },
  features: {
    list: (id) => request(`/api/characters/${id}/features`),
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
    canLevelUp: (id) => request(`/api/characters/${id}/progression/can-level-up`),
    asiChoices: (id) => request(`/api/characters/${id}/progression/asi-choices`),
  },
}
