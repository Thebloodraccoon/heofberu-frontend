import request from './client.js'

export const api = {
  ping: () => request('/api/ping/'),

  auth: {
    login: (body) => request('/api/auth/login', { method: 'POST', body, auth: false }),
    register: (body) => request('/api/auth/register', { method: 'POST', body, auth: false }),
    logout: () => request('/api/auth/logout', { method: 'POST' }),
  },

  users: {
    list: (params) => request('/api/users/', { params }),
    create: (body) => request('/api/users/', { method: 'POST', body }),
    me: () => request('/api/users/me'),
    updateMe: (body) => request('/api/users/me', { method: 'PUT', body }),
    get: (id) => request(`/api/users/${id}`),
    update: (id, body) => request(`/api/users/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),
  },

  races: {
    list: (params) => request('/api/races/', { params }),
    brief: (params) => request('/api/races/brief', { params }),
    create: (body) => request('/api/races/', { method: 'POST', body }),
    get: (id) => request(`/api/races/${id}`),
    update: (id, body) => request(`/api/races/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/races/${id}`, { method: 'DELETE' }),
    abilityBonuses: (id, body) =>
      request(`/api/races/${id}/ability-bonuses`, { method: 'PUT', body }),
    skills: (id, body) => request(`/api/races/${id}/skills`, { method: 'PUT', body }),
    features: (id, body) => request(`/api/races/${id}/features`, { method: 'PUT', body }),
  },

  classes: {
    list: (params) => request('/api/classes/', { params }),
    brief: (params) => request('/api/classes/brief', { params }),
    create: (body) => request('/api/classes/', { method: 'POST', body }),
    get: (id) => request(`/api/classes/${id}`),
    update: (id, body) => request(`/api/classes/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/classes/${id}`, { method: 'DELETE' }),
    savingThrows: (id, body) =>
      request(`/api/classes/${id}/saving-throws`, { method: 'PUT', body }),
    availableSkills: (id, body) =>
      request(`/api/classes/${id}/available-skills`, { method: 'PUT', body }),
    spellSlots: (id, level, body) =>
      request(`/api/classes/${id}/spell-slots/${level}`, { method: 'PUT', body }),
    features: (id, body) => request(`/api/classes/${id}/features`, { method: 'PUT', body }),
    progression: (id) => request(`/api/classes/${id}/progression`),
    subclasses: (id) => request(`/api/classes/${id}/subclasses`),
    subclass: (classId, subclassId) =>
      request(`/api/classes/${classId}/subclasses/${subclassId}`),
  },

  skills: {
    list: (params) => request('/api/skills/', { params }),
    brief: (params) => request('/api/skills/brief', { params }),
    create: (body) => request('/api/skills/', { method: 'POST', body }),
    get: (id) => request(`/api/skills/${id}`),
    update: (id, body) => request(`/api/skills/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/skills/${id}`, { method: 'DELETE' }),
  },

  spells: {
    list: (params) => request('/api/spells/', { params }),
    brief: (params) => request('/api/spells/brief', { params }),
    create: (body) => request('/api/spells/', { method: 'POST', body }),
    get: (id) => request(`/api/spells/${id}`),
    update: (id, body) => request(`/api/spells/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/spells/${id}`, { method: 'DELETE' }),
    classes: (id, body) => request(`/api/spells/${id}/classes`, { method: 'PUT', body }),
    races: (id, body) => request(`/api/spells/${id}/races`, { method: 'PUT', body }),
  },

  backgrounds: {
    list: (params) => request('/api/backgrounds/', { params }),
    brief: (params) => request('/api/backgrounds/brief', { params }),
    create: (body) => request('/api/backgrounds/', { method: 'POST', body }),
    get: (id) => request(`/api/backgrounds/${id}`),
    update: (id, body) => request(`/api/backgrounds/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/backgrounds/${id}`, { method: 'DELETE' }),
    skills: (id, body) => request(`/api/backgrounds/${id}/skills`, { method: 'PUT', body }),
    features: (id, body) => request(`/api/backgrounds/${id}/features`, { method: 'PUT', body }),
  },

  feats: {
    list: (params) => request('/api/feats/', { params }),
    brief: (params) => request('/api/feats/brief', { params }),
    create: (body) => request('/api/feats/', { method: 'POST', body }),
    get: (id) => request(`/api/feats/${id}`),
    update: (id, body) => request(`/api/feats/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/feats/${id}`, { method: 'DELETE' }),
    abilityScoreIncreases: (id, body) =>
      request(`/api/feats/${id}/ability-score-increases`, { method: 'PUT', body }),
    features: (id, body) => request(`/api/feats/${id}/features`, { method: 'PUT', body }),
  },

  features: {
    list: (params) => request('/api/features/', { params }),
    brief: (params) => request('/api/features/brief', { params }),
    create: (body) => request('/api/features/', { method: 'POST', body }),
    get: (id) => request(`/api/features/${id}`),
    update: (id, body) => request(`/api/features/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/features/${id}`, { method: 'DELETE' }),
  },

  items: {
    list: (params) => request('/api/items/', { params }),
    brief: (params) => request('/api/items/brief', { params }),
    create: (body) => request('/api/items/', { method: 'POST', body }),
    get: (id) => request(`/api/items/${id}`),
    update: (id, body) => request(`/api/items/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/items/${id}`, { method: 'DELETE' }),
  },

  characters: {
    list: (params) => request('/api/characters/', { params }),
    create: (body) => request('/api/characters/', { method: 'POST', body }),
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
      list: (id) => request(`/api/characters/${id}/feats/`),
      add: (id, body) => request(`/api/characters/${id}/feats/`, { method: 'POST', body }),
      update: (id, charFeatId, body) =>
        request(`/api/characters/${id}/feats/${charFeatId}`, { method: 'PATCH', body }),
      remove: (id, charFeatId) =>
        request(`/api/characters/${id}/feats/${charFeatId}`, { method: 'DELETE' }),
    },
    features: {
      list: (id) => request(`/api/characters/${id}/features/`),
      add: (id, body) => request(`/api/characters/${id}/features/`, { method: 'POST', body }),
      update: (id, charFeatureId, body) =>
        request(`/api/characters/${id}/features/${charFeatureId}`, { method: 'PATCH', body }),
      remove: (id, charFeatureId) =>
        request(`/api/characters/${id}/features/${charFeatureId}`, { method: 'DELETE' }),
    },
    items: {
      list: (id) => request(`/api/characters/${id}/items/`),
      add: (id, body) => request(`/api/characters/${id}/items/`, { method: 'POST', body }),
      update: (id, charItemId, body) =>
        request(`/api/characters/${id}/items/${charItemId}`, { method: 'PATCH', body }),
      remove: (id, charItemId) =>
        request(`/api/characters/${id}/items/${charItemId}`, { method: 'DELETE' }),
    },
    conditions: {
      list: (id) => request(`/api/characters/${id}/conditions/`),
      add: (id, body) => request(`/api/characters/${id}/conditions/`, { method: 'POST', body }),
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
      levelUp: (id, body) =>
        request(`/api/characters/${id}/progression/level-up`, { method: 'POST', body }),
      asiChoices: (id) => request(`/api/characters/${id}/progression/asi-choices`),
    },
  },
}
