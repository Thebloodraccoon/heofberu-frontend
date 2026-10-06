import request from '@/lib/api/httpClient.js'

export const catalogApi = {
  races: {
    list: (params) => request('/races', { params }),
    create: (body) => request('/races', { method: 'POST', body }),
    get: (id) => request(`/races/${id}`),
    update: (id, body) => request(`/races/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/races/${id}`, { method: 'DELETE' }),
    abilityBonuses: (id, body) =>
      request(`/races/${id}/ability-bonuses`, { method: 'PUT', body }),
    skills: (id, body) => request(`/races/${id}/skills`, { method: 'PUT', body }),
    tags: (id, body) => request(`/races/${id}/tags`, { method: 'PUT', body }),
    image: {
      upload: (id, file) => {
        const form = new FormData()
        form.append('image', file)
        return request(`/races/${id}/image`, { method: 'PUT', body: form })
      },
      remove: (id) => request(`/races/${id}/image`, { method: 'DELETE' }),
    },
    features: {
      // Фичи централизованы: только список по источнику (GET-only на бэкенде).
      // Создание/изменение/удаление идут через /features.
      list: (id) => request(`/races/${id}/features`),
    },
    subraces: {
      list: (raceId) => request('/subraces', { params: { race_id: raceId } }),
      create: (raceId, body) =>
        request('/subraces', { method: 'POST', body: { ...body, race_id: raceId } }),
      get: (_raceId, subraceId) => request(`/subraces/${subraceId}`),
      update: (_raceId, subraceId, body) =>
        request(`/subraces/${subraceId}`, { method: 'PATCH', body }),
      remove: (_raceId, subraceId) => request(`/subraces/${subraceId}`, { method: 'DELETE' }),
      abilityBonuses: (_raceId, subraceId, body) =>
        request(`/subraces/${subraceId}/ability-bonuses`, { method: 'PUT', body }),
      tags: (_raceId, subraceId, body) =>
        request(`/subraces/${subraceId}/tags`, { method: 'PUT', body }),
      features: {
        // Фичи централизованы: только список по источнику (GET-only).
        list: (_raceId, subraceId) => request(`/subraces/${subraceId}/features`),
      },
      image: {
        upload: (_raceId, subraceId, file) => {
          const form = new FormData()
          form.append('image', file)
          return request(`/subraces/${subraceId}/image`, { method: 'PUT', body: form })
        },
        remove: (_raceId, subraceId) =>
          request(`/subraces/${subraceId}/image`, { method: 'DELETE' }),
      },
    },
  },

  classes: {
    list: (params) => request('/classes', { params }),
    create: (body) => request('/classes', { method: 'POST', body }),
    get: (id) => request(`/classes/${id}`),
    update: (id, body) => request(`/classes/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/classes/${id}`, { method: 'DELETE' }),
    savingThrows: (id, body) =>
      request(`/classes/${id}/saving-throws`, { method: 'PUT', body }),
    availableSkills: (id, body) =>
      request(`/classes/${id}/available-skills`, { method: 'PUT', body }),
    armorProficiencies: (id, body) =>
      request(`/classes/${id}/armor-proficiencies`, { method: 'PUT', body }),
    weaponProficiencies: (id, body) =>
      request(`/classes/${id}/weapon-proficiencies`, { method: 'PUT', body }),
    image: {
      upload: (id, file) => {
        const form = new FormData()
        form.append('image', file)
        return request(`/classes/${id}/image`, { method: 'PUT', body: form })
      },
      remove: (id) => request(`/classes/${id}/image`, { method: 'DELETE' }),
    },
    items: {
      list: (id) => request(`/classes/${id}/items`),
      set: (id, body) => request(`/classes/${id}/items`, { method: 'PUT', body }),
    },
    choiceGroups: {
      list: (id) => request(`/classes/${id}/choice-groups`),
      set: (id, body) => request(`/classes/${id}/choice-groups`, { method: 'PUT', body }),
    },
    spellSlots: (id, level, body) =>
      request(`/classes/${id}/spell-slots`, {
        method: 'PUT',
        body,
        params: { class_level: level },
      }),
    features: {
      // Фичи централизованы: только список по источнику (GET-only).
      list: (id) => request(`/classes/${id}/features`),
    },
    progression: (id) => request(`/classes/${id}/progression`),
    subclasses: {
      list: (classId) => request('/subclasses', { params: { class_id: classId } }),
      create: (classId, body) =>
        request('/subclasses', { method: 'POST', body: { ...body, class_id: classId } }),
      get: (_classId, subclassId) => request(`/subclasses/${subclassId}`),
      update: (_classId, subclassId, body) =>
        request(`/subclasses/${subclassId}`, { method: 'PATCH', body }),
      remove: (_classId, subclassId) => request(`/subclasses/${subclassId}`, { method: 'DELETE' }),
      features: {
        // Фичи централизованы: только список по источнику (GET-only).
        list: (_classId, subclassId) => request(`/subclasses/${subclassId}/features`),
      },
      image: {
        upload: (_classId, subclassId, file) => {
          const form = new FormData()
          form.append('image', file)
          return request(`/subclasses/${subclassId}/image`, { method: 'PUT', body: form })
        },
        remove: (_classId, subclassId) =>
          request(`/subclasses/${subclassId}/image`, { method: 'DELETE' }),
      },
    },
  },

  skills: {
    list: (params) => request('/skills', { params }),
    create: (body) => request('/skills', { method: 'POST', body }),
    get: (id) => request(`/skills/${id}`),
    update: (id, body) => request(`/skills/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/skills/${id}`, { method: 'DELETE' }),
  },

  spells: {
    list: (params) => request('/spells', { params }),
    create: (body) => request('/spells', { method: 'POST', body }),
    get: (id) => request(`/spells/${id}`),
    update: (id, body) => request(`/spells/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/spells/${id}`, { method: 'DELETE' }),
    classes: (id, body) => request(`/spells/${id}/classes`, { method: 'PUT', body }),
    subclasses: (id, body) => request(`/spells/${id}/subclasses`, { method: 'PUT', body }),
    races: (id, body) => request(`/spells/${id}/races`, { method: 'PUT', body }),
    subraces: (id, body) => request(`/spells/${id}/subraces`, { method: 'PUT', body }),
  },

  backgrounds: {
    list: (params) => request('/backgrounds', { params }),
    create: (body) => request('/backgrounds', { method: 'POST', body }),
    get: (id) => request(`/backgrounds/${id}`),
    update: (id, body) => request(`/backgrounds/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/backgrounds/${id}`, { method: 'DELETE' }),
    skills: (id, body) => request(`/backgrounds/${id}/skills`, { method: 'PUT', body }),
    tags: (id, body) => request(`/backgrounds/${id}/tags`, { method: 'PUT', body }),
    items: {
      list: (id) => request(`/backgrounds/${id}/items`),
      set: (id, body) => request(`/backgrounds/${id}/items`, { method: 'PUT', body }),
    },
    suggestions: {
      list: (id) => request(`/backgrounds/${id}/suggestions`),
      create: (id, body) => request(`/backgrounds/${id}/suggestions`, { method: 'POST', body }),
      update: (id, suggestionId, body) =>
        request(`/backgrounds/${id}/suggestions/${suggestionId}`, { method: 'PATCH', body }),
      remove: (id, suggestionId) =>
        request(`/backgrounds/${id}/suggestions/${suggestionId}`, { method: 'DELETE' }),
    },
    features: {
      // Фичи централизованы: только список по источнику (GET-only).
      list: (id) => request(`/backgrounds/${id}/features`),
    },
  },

  feats: {
    list: (params) => request('/feats', { params }),
    create: (body) => request('/feats', { method: 'POST', body }),
    get: (id) => request(`/feats/${id}`),
    update: (id, body) => request(`/feats/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/feats/${id}`, { method: 'DELETE' }),
    // Черта — подтип особенности: полное дерево эффектов + группы выбора
    // сохраняются теми же дифф-эндпоинтами, что и у /features.
    effects: {
      get: (id) => request(`/feats/${id}/effects`),
      set: (id, body) => request(`/feats/${id}/effects`, { method: 'PUT', body }),
    },
    choiceGroups: {
      get: (id) => request(`/feats/${id}/choice-groups`),
      set: (id, body) => request(`/feats/${id}/choice-groups`, { method: 'PUT', body }),
    },
  },

  features: {
    list: (params) => request('/features', { params }),
    create: (body) => request('/features', { method: 'POST', body }),
    get: (id) => request(`/features/${id}`),
    update: (id, body) => request(`/features/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/features/${id}`, { method: 'DELETE' }),
    // Двигатель особенностей: полное дерево эффектов + группы выбора.
    // GET уже отдаётся вместе с самой особенностью (ability_effects), этот
    // блок нужен для записи и для остальных 5 типов эффектов/групп выбора.
    effects: {
      get: (id) => request(`/features/${id}/effects`),
      set: (id, body) => request(`/features/${id}/effects`, { method: 'PUT', body }),
    },
    choiceGroups: {
      get: (id) => request(`/features/${id}/choice-groups`),
      set: (id, body) => request(`/features/${id}/choice-groups`, { method: 'PUT', body }),
    },
  },

  items: {
    list: (params) => request('/items', { params }),
    create: (body) => request('/items', { method: 'POST', body }),
    get: (id) => request(`/items/${id}`),
    update: (id, body) => request(`/items/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/items/${id}`, { method: 'DELETE' }),
  },
}
