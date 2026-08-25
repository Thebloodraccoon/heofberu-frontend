import request from '@/lib/api/httpClient.js'

export const charactersApi = {
  list: (params) => request('/api/characters', { params }),
  listMine: (params) => request('/api/characters/mine', { params }),
  listAll: (params) => request('/api/characters/all', { params }),
  create: (body) => request('/api/characters', { method: 'POST', body }),
  get: (id) => request(`/api/characters/${id}`),
  update: (id, body) => request(`/api/characters/${id}`, { method: 'PATCH', body }),
  remove: (id) => request(`/api/characters/${id}`, { method: 'DELETE' }),
  hp: (id, body) =>
    request('/api/characters/hp', { method: 'PATCH', body, params: { character_id: id } }),
  rest: (id, body) =>
    request('/api/characters/rest', { method: 'POST', body, params: { character_id: id } }),
  gmPanel: {
    stats: (id) => request('/api/characters/gm-panel/stats', { params: { character_id: id } }),
    maxHp: (id, body) =>
      request('/api/characters/gm-panel/max-hp', {
        method: 'PATCH',
        body,
        params: { character_id: id },
      }),
    maxLevel: {
      get: (id) => request('/api/characters/gm-panel/max-level', { params: { character_id: id } }),
      set: (id, body) =>
        request('/api/characters/gm-panel/max-level', {
          method: 'PATCH',
          body,
          params: { character_id: id },
        }),
    },
    asi: {
      list: (id) => request('/api/characters/gm-panel/asi', { params: { character_id: id } }),
      add: (id, body) =>
        request('/api/characters/gm-panel/asi', {
          method: 'POST',
          body,
          params: { character_id: id },
        }),
      remove: (id, adjustmentId) =>
        request('/api/characters/gm-panel/asi', {
          method: 'DELETE',
          params: { character_id: id, adjustment_id: adjustmentId },
        }),
    },
    skills: {
      setExpertise: (id, skillId, body) =>
        request('/api/characters/gm-panel/skills', {
          method: 'PATCH',
          body,
          params: { character_id: id, skill_id: skillId },
        }),
    },
    feats: {
      add: (id, body) =>
        request('/api/characters/gm-panel/feats', {
          method: 'POST',
          body,
          params: { character_id: id },
        }),
      update: (id, charFeatId, body) =>
        request('/api/characters/gm-panel/feats', {
          method: 'PATCH',
          body,
          params: { character_id: id, feat_id: charFeatId },
        }),
      remove: (id, charFeatId) =>
        request('/api/characters/gm-panel/feats', {
          method: 'DELETE',
          params: { character_id: id, feat_id: charFeatId },
        }),
    },
    features: {
      add: (id, body) =>
        request('/api/characters/gm-panel/features', {
          method: 'POST',
          body,
          params: { character_id: id },
        }),
      update: (id, charFeatureId, body) =>
        request('/api/characters/gm-panel/features', {
          method: 'PATCH',
          body,
          params: { character_id: id, feature_id: charFeatureId },
        }),
      remove: (id, charFeatureId) =>
        request('/api/characters/gm-panel/features', {
          method: 'DELETE',
          params: { character_id: id, feature_id: charFeatureId },
        }),
    },
    items: {
      list: (id) => request('/api/characters/gm-panel/items', { params: { character_id: id } }),
      add: (id, body) =>
        request('/api/characters/gm-panel/items', {
          method: 'POST',
          body,
          params: { character_id: id },
        }),
      update: (id, charItemId, body) =>
        request('/api/characters/gm-panel/items', {
          method: 'PATCH',
          body,
          params: { character_id: id, item_id: charItemId },
        }),
      remove: (id, charItemId) =>
        request('/api/characters/gm-panel/items', {
          method: 'DELETE',
          params: { character_id: id, item_id: charItemId },
        }),
    },
  },
  spells: {
    list: (id) => request('/api/characters/spells', { params: { character_id: id } }),
    add: (id, body) =>
      request('/api/characters/spells', { method: 'POST', body, params: { character_id: id } }),
    remove: (id, spellId) =>
      request('/api/characters/spells', {
        method: 'DELETE',
        params: { character_id: id, spell_id: spellId },
      }),
  },
  attacks: {
    list: (id) => request('/api/characters/attacks', { params: { character_id: id } }),
    add: (id, body) =>
      request('/api/characters/attacks', { method: 'POST', body, params: { character_id: id } }),
    update: (id, attackId, body) =>
      request('/api/characters/attacks', {
        method: 'PATCH',
        body,
        params: { character_id: id, attack_id: attackId },
      }),
    remove: (id, attackId) =>
      request('/api/characters/attacks', {
        method: 'DELETE',
        params: { character_id: id, attack_id: attackId },
      }),
  },
  feats: {
    list: (id) => request('/api/characters/feats', { params: { character_id: id } }),
  },
  features: {
    list: (id) => request('/api/characters/features', { params: { character_id: id } }),
  },
  conditions: {
    list: (id) => request('/api/characters/conditions', { params: { character_id: id } }),
    add: (id, body) =>
      request('/api/characters/conditions', {
        method: 'POST',
        body,
        params: { character_id: id },
      }),
    update: (id, condition, body) =>
      request('/api/characters/conditions', {
        method: 'PATCH',
        body,
        params: { character_id: id, condition },
      }),
    remove: (id, condition) =>
      request('/api/characters/conditions', {
        method: 'DELETE',
        params: { character_id: id, condition },
      }),
  },
  progression: {
    background: (id, body) =>
      request('/api/characters/progression/background', {
        method: 'PATCH',
        body,
        params: { character_id: id },
      }),
    subclass: (id, body) =>
      request('/api/characters/progression/subclass', {
        method: 'PATCH',
        body,
        params: { character_id: id },
      }),
    subrace: (id, body) =>
      request('/api/characters/progression/subrace', {
        method: 'PATCH',
        body,
        params: { character_id: id },
      }),
    levelUp: (id, body) =>
      request('/api/characters/progression/level-up', {
        method: 'POST',
        body,
        params: { character_id: id },
      }),
    canLevelUp: (id) =>
      request('/api/characters/progression/can-level-up', { params: { character_id: id } }),
    asiChoices: (id) =>
      request('/api/characters/progression/asi-choices', { params: { character_id: id } }),
  },
}
