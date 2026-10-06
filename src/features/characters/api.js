import request from '@/lib/api/httpClient.js'

export const charactersApi = {
  list: (params) => request('/characters', { params }),
  listMine: (params) => request('/characters', { params: { ...params, scope: 'mine' } }),
  listAll: (params) => request('/characters', { params: { ...params, scope: 'all' } }),
  create: (body) => request('/characters', { method: 'POST', body }),
  get: (id) => request(`/characters/${id}`),
  update: (id, body) => request(`/characters/${id}`, { method: 'PATCH', body }),
  remove: (id) => request(`/characters/${id}`, { method: 'DELETE' }),
  backstory: {
    get: (id) => request(`/characters/${id}/backstory`),
    set: (id, body) => request(`/characters/${id}/backstory`, { method: 'PUT', body }),
  },
  hp: (id, body) => request(`/characters/${id}/hp`, { method: 'PATCH', body }),
  rest: (id, body) => request(`/characters/${id}/rest`, { method: 'POST', body }),
  stats: {
    // Общий калькулятор характеристик: база, итог и вклад каждого источника.
    get: (id) => request(`/characters/${id}/stats`),
  },
  proficiencies: {
    // Материализованные владения (навыки/спасброски/доспехи/оружие) с источником каждой записи.
    get: (id) => request(`/characters/${id}/proficiencies`),
  },
  gmPanel: {
    maxHp: (id, body) => request(`/characters/${id}/gm-panel/max-hp`, { method: 'PATCH', body }),
    maxLevel: {
      get: (id) => request(`/characters/${id}/gm-panel/max-level`),
      set: (id, body) =>
        request(`/characters/${id}/gm-panel/max-level`, { method: 'PATCH', body }),
    },
    asi: {
      list: (id) => request(`/characters/${id}/gm-panel/asi`),
      add: (id, body) => request(`/characters/${id}/gm-panel/asi`, { method: 'POST', body }),
      remove: (id, adjustmentId) =>
        request(`/characters/${id}/gm-panel/asi`, {
          method: 'DELETE',
          params: { adjustment_id: adjustmentId },
        }),
    },
    proficiencies: {
      addSkill: (id, skillId) =>
        request(`/characters/${id}/gm-panel/proficiencies/skills`, {
          method: 'POST',
          body: { skill_id: skillId },
        }),
      removeSkill: (id, skillId) =>
        request(`/characters/${id}/gm-panel/proficiencies/skills`, {
          method: 'DELETE',
          params: { skill_id: skillId },
        }),
      setSkillExpertise: (id, skillId, body) =>
        request(`/characters/${id}/gm-panel/proficiencies/skills/expertise`, {
          method: 'PATCH',
          body,
          params: { skill_id: skillId },
        }),
      addSavingThrow: (id, ability) =>
        request(`/characters/${id}/gm-panel/proficiencies/saving-throws`, {
          method: 'POST',
          body: { ability },
        }),
      removeSavingThrow: (id, ability) =>
        request(`/characters/${id}/gm-panel/proficiencies/saving-throws`, {
          method: 'DELETE',
          params: { ability },
        }),
      addArmor: (id, armorType) =>
        request(`/characters/${id}/gm-panel/proficiencies/armor`, {
          method: 'POST',
          body: { armor_type: armorType },
        }),
      removeArmor: (id, armorType) =>
        request(`/characters/${id}/gm-panel/proficiencies/armor`, {
          method: 'DELETE',
          params: { armor_type: armorType },
        }),
      addWeapon: (id, body) =>
        request(`/characters/${id}/gm-panel/proficiencies/weapons`, { method: 'POST', body }),
      removeWeapon: (id, params) =>
        request(`/characters/${id}/gm-panel/proficiencies/weapons`, { method: 'DELETE', params }),
    },
    spells: {
      add: (id, body) => request(`/characters/${id}/gm-panel/spells`, { method: 'POST', body }),
      remove: (id, spellId) =>
        request(`/characters/${id}/gm-panel/spells`, {
          method: 'DELETE',
          params: { spell_id: spellId },
        }),
    },
    feats: {
      add: (id, body) => request(`/characters/${id}/gm-panel/feats`, { method: 'POST', body }),
      update: (id, charFeatId, body) =>
        request(`/characters/${id}/gm-panel/feats`, {
          method: 'PATCH',
          body,
          params: { feat_id: charFeatId },
        }),
      remove: (id, charFeatId) =>
        request(`/characters/${id}/gm-panel/feats`, {
          method: 'DELETE',
          params: { feat_id: charFeatId },
        }),
    },
    features: {
      add: (id, body) =>
        request(`/characters/${id}/gm-panel/features`, { method: 'POST', body }),
      update: (id, charFeatureId, body) =>
        request(`/characters/${id}/gm-panel/features`, {
          method: 'PATCH',
          body,
          params: { feature_id: charFeatureId },
        }),
      remove: (id, charFeatureId) =>
        request(`/characters/${id}/gm-panel/features`, {
          method: 'DELETE',
          params: { feature_id: charFeatureId },
        }),
    },
    items: {
      add: (id, body) => request(`/characters/${id}/gm-panel/items`, { method: 'POST', body }),
      update: (id, charItemId, body) =>
        request(`/characters/${id}/gm-panel/items`, {
          method: 'PATCH',
          body,
          params: { item_id: charItemId },
        }),
      remove: (id, charItemId) =>
        request(`/characters/${id}/gm-panel/items`, {
          method: 'DELETE',
          params: { item_id: charItemId },
        }),
    },
  },
  spells: {
    list: (id) => request(`/characters/${id}/spells`),
    add: (id, body) => request(`/characters/${id}/spells`, { method: 'POST', body }),
    remove: (id, spellId) => request(`/characters/${id}/spells/${spellId}`, { method: 'DELETE' }),
  },
  attacks: {
    list: (id) => request(`/characters/${id}/attacks`),
    add: (id, body) => request(`/characters/${id}/attacks`, { method: 'POST', body }),
    update: (id, attackId, body) =>
      request(`/characters/${id}/attacks/${attackId}`, { method: 'PATCH', body }),
    remove: (id, attackId) =>
      request(`/characters/${id}/attacks/${attackId}`, { method: 'DELETE' }),
  },
  feats: {
    list: (id) => request(`/characters/${id}/feats`),
  },
  features: {
    list: (id) => request(`/characters/${id}/features`),
    choices: {
      get: (id, characterFeatureId) =>
        request(`/characters/${id}/features/${characterFeatureId}/choices`),
      answer: (id, characterFeatureId, body) =>
        request(`/characters/${id}/features/${characterFeatureId}/choices`, { method: 'PATCH', body }),
    },
  },
  grants: {
    // Все ещё не отвеченные группы выбора по всем грантам персонажа разом —
    // чтобы не опрашивать choices каждого granted-feature по отдельности.
    pending: (id) => request(`/characters/${id}/grants/pending`),
    // Отвеченная сторона того же — какие варианты игрок уже выбрал.
    answered: (id) => request(`/characters/${id}/grants/answered`),
  },
  items: {
    list: (id) => request(`/characters/${id}/items`),
    add: (id, body) => request(`/characters/${id}/items`, { method: 'POST', body }),
    update: (id, charItemId, body) =>
      request(`/characters/${id}/items`, {
        method: 'PATCH',
        body,
        params: { item_id: charItemId },
      }),
    remove: (id, charItemId) =>
      request(`/characters/${id}/items`, {
        method: 'DELETE',
        params: { item_id: charItemId },
      }),
  },
  conditions: {
    list: (id) => request(`/characters/${id}/conditions`),
    add: (id, body) => request(`/characters/${id}/conditions`, { method: 'POST', body }),
    update: (id, condition, body) =>
      request(`/characters/${id}/conditions/${condition}`, { method: 'PATCH', body }),
    remove: (id, condition) =>
      request(`/characters/${id}/conditions/${condition}`, { method: 'DELETE' }),
  },
  progression: {
    background: (id, body) =>
      request(`/characters/${id}/progression/background`, { method: 'PATCH', body }),
    subclass: (id, body) =>
      request(`/characters/${id}/progression/subclass`, { method: 'PATCH', body }),
    subrace: (id, body) =>
      request(`/characters/${id}/progression/subrace`, { method: 'PATCH', body }),
    levelUp: (id, body) =>
      request(`/characters/${id}/progression/level-up`, { method: 'POST', body }),
    canLevelUp: (id) => request(`/characters/${id}/progression/can-level-up`),
    asiChoices: (id) => request(`/characters/${id}/progression/asi-choices`),
    rebuild: (id, body) => request(`/characters/${id}/rebuild`, { method: 'POST', body }),
  },
}
