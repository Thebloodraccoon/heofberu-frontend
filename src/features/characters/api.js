import request from '@/lib/api/httpClient.js'

export const charactersApi = {
  list: (params) => request('/api/characters', { params }),
  listMine: (params) => request('/api/characters/mine', { params }),
  listAll: (params) => request('/api/characters/all', { params }),
  create: (body) => request('/api/characters', { method: 'POST', body }),
  get: (id) => request(`/api/characters/${id}`),
  update: (id, body) => request(`/api/characters/${id}`, { method: 'PATCH', body }),
  remove: (id) => request(`/api/characters/${id}`, { method: 'DELETE' }),
  backstory: {
    get: (id) => request(`/api/characters/${id}/backstory`),
    set: (id, body) => request(`/api/characters/${id}/backstory`, { method: 'PUT', body }),
  },
  hp: (id, body) => request(`/api/characters/${id}/hp`, { method: 'PATCH', body }),
  rest: (id, body) => request(`/api/characters/${id}/rest`, { method: 'POST', body }),
  stats: {
    // Общий калькулятор характеристик: база, итог и вклад каждого источника.
    get: (id) => request(`/api/characters/${id}/stats`),
  },
  proficiencies: {
    // Материализованные владения (навыки/спасброски/доспехи/оружие) с источником каждой записи.
    get: (id) => request(`/api/characters/${id}/proficiencies`),
  },
  gmPanel: {
    maxHp: (id, body) => request(`/api/characters/${id}/gm-panel/max-hp`, { method: 'PATCH', body }),
    maxLevel: {
      get: (id) => request(`/api/characters/${id}/gm-panel/max-level`),
      set: (id, body) =>
        request(`/api/characters/${id}/gm-panel/max-level`, { method: 'PATCH', body }),
    },
    asi: {
      list: (id) => request(`/api/characters/${id}/gm-panel/asi`),
      add: (id, body) => request(`/api/characters/${id}/gm-panel/asi`, { method: 'POST', body }),
      remove: (id, adjustmentId) =>
        request(`/api/characters/${id}/gm-panel/asi`, {
          method: 'DELETE',
          params: { adjustment_id: adjustmentId },
        }),
    },
    proficiencies: {
      addSkill: (id, skillId) =>
        request(`/api/characters/${id}/gm-panel/proficiencies/skills`, {
          method: 'POST',
          body: { skill_id: skillId },
        }),
      removeSkill: (id, skillId) =>
        request(`/api/characters/${id}/gm-panel/proficiencies/skills`, {
          method: 'DELETE',
          params: { skill_id: skillId },
        }),
      setSkillExpertise: (id, skillId, body) =>
        request(`/api/characters/${id}/gm-panel/proficiencies/skills/expertise`, {
          method: 'PATCH',
          body,
          params: { skill_id: skillId },
        }),
      addSavingThrow: (id, ability) =>
        request(`/api/characters/${id}/gm-panel/proficiencies/saving-throws`, {
          method: 'POST',
          body: { ability },
        }),
      removeSavingThrow: (id, ability) =>
        request(`/api/characters/${id}/gm-panel/proficiencies/saving-throws`, {
          method: 'DELETE',
          params: { ability },
        }),
      addArmor: (id, armorType) =>
        request(`/api/characters/${id}/gm-panel/proficiencies/armor`, {
          method: 'POST',
          body: { armor_type: armorType },
        }),
      removeArmor: (id, armorType) =>
        request(`/api/characters/${id}/gm-panel/proficiencies/armor`, {
          method: 'DELETE',
          params: { armor_type: armorType },
        }),
      addWeapon: (id, body) =>
        request(`/api/characters/${id}/gm-panel/proficiencies/weapons`, { method: 'POST', body }),
      removeWeapon: (id, params) =>
        request(`/api/characters/${id}/gm-panel/proficiencies/weapons`, { method: 'DELETE', params }),
    },
    spells: {
      add: (id, body) => request(`/api/characters/${id}/gm-panel/spells`, { method: 'POST', body }),
      remove: (id, grantedSpellId) =>
        request(`/api/characters/${id}/gm-panel/spells`, {
          method: 'DELETE',
          params: { granted_spell_id: grantedSpellId },
        }),
    },
    feats: {
      add: (id, body) => request(`/api/characters/${id}/gm-panel/feats`, { method: 'POST', body }),
      update: (id, charFeatId, body) =>
        request(`/api/characters/${id}/gm-panel/feats`, {
          method: 'PATCH',
          body,
          params: { feat_id: charFeatId },
        }),
      remove: (id, charFeatId) =>
        request(`/api/characters/${id}/gm-panel/feats`, {
          method: 'DELETE',
          params: { feat_id: charFeatId },
        }),
    },
    features: {
      add: (id, body) =>
        request(`/api/characters/${id}/gm-panel/features`, { method: 'POST', body }),
      update: (id, charFeatureId, body) =>
        request(`/api/characters/${id}/gm-panel/features`, {
          method: 'PATCH',
          body,
          params: { feature_id: charFeatureId },
        }),
      remove: (id, charFeatureId) =>
        request(`/api/characters/${id}/gm-panel/features`, {
          method: 'DELETE',
          params: { feature_id: charFeatureId },
        }),
    },
    items: {
      add: (id, body) => request(`/api/characters/${id}/gm-panel/items`, { method: 'POST', body }),
      update: (id, charItemId, body) =>
        request(`/api/characters/${id}/gm-panel/items`, {
          method: 'PATCH',
          body,
          params: { item_id: charItemId },
        }),
      remove: (id, charItemId) =>
        request(`/api/characters/${id}/gm-panel/items`, {
          method: 'DELETE',
          params: { item_id: charItemId },
        }),
    },
  },
  spells: {
    list: (id) => request(`/api/characters/${id}/spells`),
    add: (id, body) => request(`/api/characters/${id}/spells`, { method: 'POST', body }),
    remove: (id, spellId) =>
      request(`/api/characters/${id}/spells`, {
        method: 'DELETE',
        params: { spell_id: spellId },
      }),
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
  items: {
    list: (id) => request(`/api/characters/${id}/items`),
    add: (id, body) => request(`/api/characters/${id}/items`, { method: 'POST', body }),
    update: (id, charItemId, body) =>
      request(`/api/characters/${id}/items`, {
        method: 'PATCH',
        body,
        params: { item_id: charItemId },
      }),
    remove: (id, charItemId) =>
      request(`/api/characters/${id}/items`, {
        method: 'DELETE',
        params: { item_id: charItemId },
      }),
  },
  conditions: {
    list: (id) => request(`/api/characters/${id}/conditions`),
    add: (id, body) => request(`/api/characters/${id}/conditions`, { method: 'POST', body }),
    update: (id, condition, body) =>
      request(`/api/characters/${id}/conditions`, {
        method: 'PATCH',
        body,
        params: { condition },
      }),
    remove: (id, condition) =>
      request(`/api/characters/${id}/conditions`, {
        method: 'DELETE',
        params: { condition },
      }),
  },
  progression: {
    background: (id, body) =>
      request(`/api/characters/${id}/progression/background`, { method: 'PATCH', body }),
    subclass: (id, body) =>
      request(`/api/characters/${id}/progression/subclass`, { method: 'PATCH', body }),
    subrace: (id, body) =>
      request(`/api/characters/${id}/progression/subrace`, { method: 'PATCH', body }),
    levelUp: (id, body) =>
      request(`/api/characters/${id}/progression/level-up`, { method: 'POST', body }),
    canLevelUp: (id) => request(`/api/characters/${id}/progression/can-level-up`),
    asiChoices: (id) => request(`/api/characters/${id}/progression/asi-choices`),
    rebuild: (id, body) => request(`/api/characters/${id}/rebuild`, { method: 'POST', body }),
  },
}
