import request from '@/lib/api/httpClient.js'

export const catalogApi = {
  races: {
    list: (params) => request('/api/races', { params }),
    create: (body) => request('/api/races', { method: 'POST', body }),
    get: (id) => request(`/api/races/${id}`),
    update: (id, body) => request(`/api/races/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/races/${id}`, { method: 'DELETE' }),
    abilityBonuses: (id, body) =>
      request(`/api/races/${id}/ability-bonuses`, { method: 'PUT', body }),
    skills: (id, body) => request(`/api/races/${id}/skills`, { method: 'PUT', body }),
    features: {
      list: (id) => request(`/api/races/${id}/features`),
      add: (id, body) => request(`/api/races/${id}/features`, { method: 'POST', body }),
      update: (id, featureId, body) =>
        request(`/api/races/${id}/features/${featureId}`, { method: 'PATCH', body }),
      remove: (id, featureId) =>
        request(`/api/races/${id}/features/${featureId}`, { method: 'DELETE' }),
    },
    subraces: {
      list: (raceId) => request(`/api/races/${raceId}/subraces`),
      create: (raceId, body) => request(`/api/races/${raceId}/subraces`, { method: 'POST', body }),
      get: (raceId, subraceId) => request(`/api/races/${raceId}/subraces/${subraceId}`),
      update: (raceId, subraceId, body) =>
        request(`/api/races/${raceId}/subraces/${subraceId}`, { method: 'PATCH', body }),
      remove: (raceId, subraceId) =>
        request(`/api/races/${raceId}/subraces/${subraceId}`, { method: 'DELETE' }),
      abilityBonuses: (raceId, subraceId, body) =>
        request(`/api/races/${raceId}/subraces/${subraceId}/ability-bonuses`, { method: 'PUT', body }),
      features: {
        list: (raceId, subraceId) =>
          request(`/api/races/${raceId}/subraces/${subraceId}/features`),
        add: (raceId, subraceId, body) =>
          request(`/api/races/${raceId}/subraces/${subraceId}/features`, { method: 'POST', body }),
        update: (raceId, subraceId, featureId, body) =>
          request(`/api/races/${raceId}/subraces/${subraceId}/features/${featureId}`, { method: 'PATCH', body }),
        remove: (raceId, subraceId, featureId) =>
          request(`/api/races/${raceId}/subraces/${subraceId}/features/${featureId}`, { method: 'DELETE' }),
      },
    },
  },

  classes: {
    list: (params) => request('/api/classes', { params }),
    create: (body) => request('/api/classes', { method: 'POST', body }),
    get: (id) => request(`/api/classes/${id}`),
    update: (id, body) => request(`/api/classes/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/classes/${id}`, { method: 'DELETE' }),
    savingThrows: (id, body) =>
      request(`/api/classes/${id}/saving-throws`, { method: 'PUT', body }),
    availableSkills: (id, body) =>
      request(`/api/classes/${id}/available-skills`, { method: 'PUT', body }),
    armorProficiencies: (id, body) =>
      request(`/api/classes/${id}/armor-proficiencies`, { method: 'PUT', body }),
    items: {
      list: (id) => request(`/api/classes/${id}/items`),
      set: (id, body) => request(`/api/classes/${id}/items`, { method: 'PUT', body }),
    },
    spellSlots: (id, level, body) =>
      request(`/api/classes/${id}/spell-slots/${level}`, { method: 'PUT', body }),
    features: {
      list: (id) => request(`/api/classes/${id}/features`),
      add: (id, body) => request(`/api/classes/${id}/features`, { method: 'POST', body }),
      update: (id, featureId, body) =>
        request(`/api/classes/${id}/features/${featureId}`, { method: 'PATCH', body }),
      remove: (id, featureId) =>
        request(`/api/classes/${id}/features/${featureId}`, { method: 'DELETE' }),
    },
    progression: (id) => request(`/api/classes/${id}/progression`),
    subclasses: {
      list: (classId) => request(`/api/classes/${classId}/subclasses`),
      create: (classId, body) => request(`/api/classes/${classId}/subclasses`, { method: 'POST', body }),
      get: (classId, subclassId) => request(`/api/classes/${classId}/subclasses/${subclassId}`),
      update: (classId, subclassId, body) =>
        request(`/api/classes/${classId}/subclasses/${subclassId}`, { method: 'PATCH', body }),
      remove: (classId, subclassId) =>
        request(`/api/classes/${classId}/subclasses/${subclassId}`, { method: 'DELETE' }),
      features: {
        list: (classId, subclassId) =>
          request(`/api/classes/${classId}/subclasses/${subclassId}/features`),
        add: (classId, subclassId, body) =>
          request(`/api/classes/${classId}/subclasses/${subclassId}/features`, { method: 'POST', body }),
        update: (classId, subclassId, featureId, body) =>
          request(`/api/classes/${classId}/subclasses/${subclassId}/features/${featureId}`, { method: 'PATCH', body }),
        remove: (classId, subclassId, featureId) =>
          request(`/api/classes/${classId}/subclasses/${subclassId}/features/${featureId}`, { method: 'DELETE' }),
      },
    },
  },

  skills: {
    list: (params) => request('/api/skills', { params }),
    create: (body) => request('/api/skills', { method: 'POST', body }),
    get: (id) => request(`/api/skills/${id}`),
    update: (id, body) => request(`/api/skills/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/skills/${id}`, { method: 'DELETE' }),
  },

  spells: {
    list: (params) => request('/api/spells', { params }),
    create: (body) => request('/api/spells', { method: 'POST', body }),
    get: (id) => request(`/api/spells/${id}`),
    update: (id, body) => request(`/api/spells/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/spells/${id}`, { method: 'DELETE' }),
    classes: (id, body) => request(`/api/spells/${id}/classes`, { method: 'PUT', body }),
    races: (id, body) => request(`/api/spells/${id}/races`, { method: 'PUT', body }),
  },

  backgrounds: {
    list: (params) => request('/api/backgrounds', { params }),
    create: (body) => request('/api/backgrounds', { method: 'POST', body }),
    get: (id) => request(`/api/backgrounds/${id}`),
    update: (id, body) => request(`/api/backgrounds/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/backgrounds/${id}`, { method: 'DELETE' }),
    skills: (id, body) => request(`/api/backgrounds/${id}/skills`, { method: 'PUT', body }),
    items: {
      list: (id) => request(`/api/backgrounds/${id}/items`),
      set: (id, body) => request(`/api/backgrounds/${id}/items`, { method: 'PUT', body }),
    },
    features: {
      list: (id) => request(`/api/backgrounds/${id}/features`),
      add: (id, body) => request(`/api/backgrounds/${id}/features`, { method: 'POST', body }),
      update: (id, featureId, body) =>
        request(`/api/backgrounds/${id}/features/${featureId}`, { method: 'PATCH', body }),
      remove: (id, featureId) =>
        request(`/api/backgrounds/${id}/features/${featureId}`, { method: 'DELETE' }),
    },
  },

  feats: {
    list: (params) => request('/api/feats', { params }),
    create: (body) => request('/api/feats', { method: 'POST', body }),
    get: (id) => request(`/api/feats/${id}`),
    update: (id, body) => request(`/api/feats/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/feats/${id}`, { method: 'DELETE' }),
    abilityScoreIncreases: (id, body) =>
      request(`/api/feats/${id}/ability-score-increases`, { method: 'PUT', body }),
    features: {
      list: (id) => request(`/api/feats/${id}/features`),
      add: (id, body) => request(`/api/feats/${id}/features`, { method: 'POST', body }),
      update: (id, featureId, body) =>
        request(`/api/feats/${id}/features/${featureId}`, { method: 'PATCH', body }),
      remove: (id, featureId) =>
        request(`/api/feats/${id}/features/${featureId}`, { method: 'DELETE' }),
    },
  },

  features: {
    list: (params) => request('/api/features', { params }),
    create: (body) => request('/api/features', { method: 'POST', body }),
    get: (id) => request(`/api/features/${id}`),
    update: (id, body) => request(`/api/features/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/features/${id}`, { method: 'DELETE' }),
  },

  items: {
    list: (params) => request('/api/items', { params }),
    create: (body) => request('/api/items', { method: 'POST', body }),
    get: (id) => request(`/api/items/${id}`),
    update: (id, body) => request(`/api/items/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/items/${id}`, { method: 'DELETE' }),
  },
}
