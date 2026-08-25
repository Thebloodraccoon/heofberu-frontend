import request from '@/lib/api/httpClient.js'

export const catalogApi = {
  races: {
    list: (params) => request('/api/races', { params }),
    create: (body) => request('/api/races', { method: 'POST', body }),
    get: (id) => request(`/api/races/${id}`),
    update: (id, body) => request(`/api/races/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/races/${id}`, { method: 'DELETE' }),
    abilityBonuses: (id, body) =>
      request('/api/races/ability-bonuses', { method: 'PUT', body, params: { race_id: id } }),
    skills: (id, body) =>
      request('/api/races/skills', { method: 'PUT', body, params: { race_id: id } }),
    features: {
      list: (id) => request('/api/races/features', { params: { race_id: id } }),
      add: (id, body) =>
        request('/api/races/features', { method: 'POST', body, params: { race_id: id } }),
      update: (id, featureId, body) =>
        request('/api/races/features', {
          method: 'PATCH',
          body,
          params: { race_id: id, feature_id: featureId },
        }),
      remove: (id, featureId) =>
        request('/api/races/features', {
          method: 'DELETE',
          params: { race_id: id, feature_id: featureId },
        }),
    },
    subraces: {
      list: (raceId) => request('/api/races/subraces', { params: { race_id: raceId } }),
      create: (raceId, body) =>
        request('/api/races/subraces', { method: 'POST', body, params: { race_id: raceId } }),
      get: (raceId, subraceId) =>
        request(`/api/races/subraces/${subraceId}`, { params: { race_id: raceId } }),
      update: (raceId, subraceId, body) =>
        request('/api/races/subraces', {
          method: 'PATCH',
          body,
          params: { race_id: raceId, subrace_id: subraceId },
        }),
      remove: (raceId, subraceId) =>
        request('/api/races/subraces', {
          method: 'DELETE',
          params: { race_id: raceId, subrace_id: subraceId },
        }),
      abilityBonuses: (raceId, subraceId, body) =>
        request('/api/races/subraces/ability-bonuses', {
          method: 'PUT',
          body,
          params: { race_id: raceId, subrace_id: subraceId },
        }),
      features: {
        list: (raceId, subraceId) =>
          request('/api/races/subraces/features', {
            params: { race_id: raceId, subrace_id: subraceId },
          }),
        add: (raceId, subraceId, body) =>
          request('/api/races/subraces/features', {
            method: 'POST',
            body,
            params: { race_id: raceId, subrace_id: subraceId },
          }),
        update: (raceId, subraceId, featureId, body) =>
          request('/api/races/subraces/features', {
            method: 'PATCH',
            body,
            params: { race_id: raceId, subrace_id: subraceId, feature_id: featureId },
          }),
        remove: (raceId, subraceId, featureId) =>
          request('/api/races/subraces/features', {
            method: 'DELETE',
            params: { race_id: raceId, subrace_id: subraceId, feature_id: featureId },
          }),
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
      request('/api/classes/saving-throws', { method: 'PUT', body, params: { class_id: id } }),
    availableSkills: (id, body) =>
      request('/api/classes/available-skills', { method: 'PUT', body, params: { class_id: id } }),
    armorProficiencies: (id, body) =>
      request('/api/classes/armor-proficiencies', {
        method: 'PUT',
        body,
        params: { class_id: id },
      }),
    items: {
      list: (id) => request('/api/classes/items', { params: { class_id: id } }),
      set: (id, body) =>
        request('/api/classes/items', { method: 'PUT', body, params: { class_id: id } }),
    },
    spellSlots: (id, level, body) =>
      request('/api/classes/spell-slots', {
        method: 'PUT',
        body,
        params: { class_id: id, class_level: level },
      }),
    features: {
      list: (id) => request('/api/classes/features', { params: { class_id: id } }),
      add: (id, body) =>
        request('/api/classes/features', { method: 'POST', body, params: { class_id: id } }),
      update: (id, featureId, body) =>
        request('/api/classes/features', {
          method: 'PATCH',
          body,
          params: { class_id: id, feature_id: featureId },
        }),
      remove: (id, featureId) =>
        request('/api/classes/features', {
          method: 'DELETE',
          params: { class_id: id, feature_id: featureId },
        }),
    },
    progression: (id) => request('/api/classes/progression', { params: { class_id: id } }),
    subclasses: {
      list: (classId) => request('/api/classes/subclasses', { params: { class_id: classId } }),
      create: (classId, body) =>
        request('/api/classes/subclasses', {
          method: 'POST',
          body,
          params: { class_id: classId },
        }),
      get: (classId, subclassId) =>
        request(`/api/classes/subclasses/${subclassId}`, { params: { class_id: classId } }),
      update: (classId, subclassId, body) =>
        request('/api/classes/subclasses', {
          method: 'PATCH',
          body,
          params: { class_id: classId, subclass_id: subclassId },
        }),
      remove: (classId, subclassId) =>
        request('/api/classes/subclasses', {
          method: 'DELETE',
          params: { class_id: classId, subclass_id: subclassId },
        }),
      features: {
        list: (classId, subclassId) =>
          request('/api/classes/subclasses/features', {
            params: { class_id: classId, subclass_id: subclassId },
          }),
        add: (classId, subclassId, body) =>
          request('/api/classes/subclasses/features', {
            method: 'POST',
            body,
            params: { class_id: classId, subclass_id: subclassId },
          }),
        update: (classId, subclassId, featureId, body) =>
          request('/api/classes/subclasses/features', {
            method: 'PATCH',
            body,
            params: { class_id: classId, subclass_id: subclassId, feature_id: featureId },
          }),
        remove: (classId, subclassId, featureId) =>
          request('/api/classes/subclasses/features', {
            method: 'DELETE',
            params: { class_id: classId, subclass_id: subclassId, feature_id: featureId },
          }),
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
    classes: (id, body) =>
      request('/api/spells/classes', { method: 'PUT', body, params: { spell_id: id } }),
    subclasses: (id, body) =>
      request('/api/spells/subclasses', { method: 'PUT', body, params: { spell_id: id } }),
    races: (id, body) =>
      request('/api/spells/races', { method: 'PUT', body, params: { spell_id: id } }),
    subraces: (id, body) =>
      request('/api/spells/subraces', { method: 'PUT', body, params: { spell_id: id } }),
  },

  backgrounds: {
    list: (params) => request('/api/backgrounds', { params }),
    create: (body) => request('/api/backgrounds', { method: 'POST', body }),
    get: (id) => request(`/api/backgrounds/${id}`),
    update: (id, body) => request(`/api/backgrounds/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/backgrounds/${id}`, { method: 'DELETE' }),
    skills: (id, body) =>
      request('/api/backgrounds/skills', { method: 'PUT', body, params: { background_id: id } }),
    items: {
      list: (id) => request('/api/backgrounds/items', { params: { background_id: id } }),
      set: (id, body) =>
        request('/api/backgrounds/items', {
          method: 'PUT',
          body,
          params: { background_id: id },
        }),
    },
    features: {
      list: (id) => request('/api/backgrounds/features', { params: { background_id: id } }),
      add: (id, body) =>
        request('/api/backgrounds/features', {
          method: 'POST',
          body,
          params: { background_id: id },
        }),
      update: (id, featureId, body) =>
        request('/api/backgrounds/features', {
          method: 'PATCH',
          body,
          params: { background_id: id, feature_id: featureId },
        }),
      remove: (id, featureId) =>
        request('/api/backgrounds/features', {
          method: 'DELETE',
          params: { background_id: id, feature_id: featureId },
        }),
    },
  },

  feats: {
    list: (params) => request('/api/feats', { params }),
    create: (body) => request('/api/feats', { method: 'POST', body }),
    get: (id) => request(`/api/feats/${id}`),
    update: (id, body) => request(`/api/feats/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/api/feats/${id}`, { method: 'DELETE' }),
    abilityScoreIncreases: (id, body) =>
      request('/api/feats/ability-score-increases', {
        method: 'PUT',
        body,
        params: { feat_id: id },
      }),
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
