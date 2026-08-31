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
    image: {
      upload: (id, file) => {
        const form = new FormData()
        form.append('image', file)
        return request(`/api/races/${id}/image`, { method: 'PUT', body: form })
      },
      remove: (id) => request(`/api/races/${id}/image`, { method: 'DELETE' }),
    },
    features: {
      // Фичи централизованы: только список по источнику (GET-only на бэкенде).
      // Создание/изменение/удаление идут через /api/features.
      list: (id) => request(`/api/races/${id}/features`),
    },
    subraces: {
      list: (raceId) => request('/api/subraces', { params: { race_id: raceId } }),
      create: (raceId, body) =>
        request('/api/subraces', { method: 'POST', body: { ...body, race_id: raceId } }),
      get: (_raceId, subraceId) => request(`/api/subraces/${subraceId}`),
      update: (_raceId, subraceId, body) =>
        request(`/api/subraces/${subraceId}`, { method: 'PATCH', body }),
      remove: (_raceId, subraceId) => request(`/api/subraces/${subraceId}`, { method: 'DELETE' }),
      abilityBonuses: (_raceId, subraceId, body) =>
        request(`/api/subraces/${subraceId}/ability-bonuses`, { method: 'PUT', body }),
      features: {
        // Фичи централизованы: только список по источнику (GET-only).
        list: (_raceId, subraceId) => request(`/api/subraces/${subraceId}/features`),
      },
      image: {
        upload: (_raceId, subraceId, file) => {
          const form = new FormData()
          form.append('image', file)
          return request(`/api/subraces/${subraceId}/image`, { method: 'PUT', body: form })
        },
        remove: (_raceId, subraceId) =>
          request(`/api/subraces/${subraceId}/image`, { method: 'DELETE' }),
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
    weaponProficiencies: (id, body) =>
      request(`/api/classes/${id}/weapon-proficiencies`, { method: 'PUT', body }),
    image: {
      upload: (id, file) => {
        const form = new FormData()
        form.append('image', file)
        return request(`/api/classes/${id}/image`, { method: 'PUT', body: form })
      },
      remove: (id) => request(`/api/classes/${id}/image`, { method: 'DELETE' }),
    },
    items: {
      list: (id) => request(`/api/classes/${id}/items`),
      set: (id, body) => request(`/api/classes/${id}/items`, { method: 'PUT', body }),
    },
    choiceGroups: {
      list: (id) => request(`/api/classes/${id}/choice-groups`),
      set: (id, body) => request(`/api/classes/${id}/choice-groups`, { method: 'PUT', body }),
    },
    spellSlots: (id, level, body) =>
      request(`/api/classes/${id}/spell-slots`, {
        method: 'PUT',
        body,
        params: { class_level: level },
      }),
    features: {
      // Фичи централизованы: только список по источнику (GET-only).
      list: (id) => request(`/api/classes/${id}/features`),
    },
    progression: (id) => request(`/api/classes/${id}/progression`),
    subclasses: {
      list: (classId) => request('/api/subclasses', { params: { class_id: classId } }),
      create: (classId, body) =>
        request('/api/subclasses', { method: 'POST', body: { ...body, class_id: classId } }),
      get: (_classId, subclassId) => request(`/api/subclasses/${subclassId}`),
      update: (_classId, subclassId, body) =>
        request(`/api/subclasses/${subclassId}`, { method: 'PATCH', body }),
      remove: (_classId, subclassId) => request(`/api/subclasses/${subclassId}`, { method: 'DELETE' }),
      features: {
        // Фичи централизованы: только список по источнику (GET-only).
        list: (_classId, subclassId) => request(`/api/subclasses/${subclassId}/features`),
      },
      image: {
        upload: (_classId, subclassId, file) => {
          const form = new FormData()
          form.append('image', file)
          return request(`/api/subclasses/${subclassId}/image`, { method: 'PUT', body: form })
        },
        remove: (_classId, subclassId) =>
          request(`/api/subclasses/${subclassId}/image`, { method: 'DELETE' }),
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
    subclasses: (id, body) => request(`/api/spells/${id}/subclasses`, { method: 'PUT', body }),
    races: (id, body) => request(`/api/spells/${id}/races`, { method: 'PUT', body }),
    subraces: (id, body) => request(`/api/spells/${id}/subraces`, { method: 'PUT', body }),
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
      // Фичи централизованы: только список по источнику (GET-only).
      list: (id) => request(`/api/backgrounds/${id}/features`),
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
  },

  features: {
    list: (params) => request('/api/features', { params }),
    create: (body) => request('/api/features', { method: 'POST', body }),
    get: (id) => request(`/api/features/${id}`),
    update: (id, body) => request(`/api/features/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/features/${id}`, { method: 'DELETE' }),
    abilityIncreases: {
      get: (id) => request(`/api/features/${id}/ability-increases`),
      set: (id, body) =>
        request(`/api/features/${id}/ability-increases`, { method: 'PUT', body }),
    },
  },

  items: {
    list: (params) => request('/api/items', { params }),
    create: (body) => request('/api/items', { method: 'POST', body }),
    get: (id) => request(`/api/items/${id}`),
    update: (id, body) => request(`/api/items/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/items/${id}`, { method: 'DELETE' }),
  },
}
