import { abilityLabels, armorProficiencyLabels, weaponProficiencyLabels } from '@/lib/i18n/index.js'

// Типы эффектов, которые выбираются экраном-списком вместо узкого меню «+».
// source: 'skills' — список тянется из справочника, иначе варианты берутся из
// labels. matches — какие строки эффекта вообще участвуют в этом экране
// (у оружия строки с конкретным предметом добавляются не здесь).
// lockExisting — уже добавленное выбрать повторно нельзя (у улучшения
// характеристики своя величина и свой предел, их правят в самой строке;
// удаление — корзиной в строке).
export const ROW_PICKERS = {
  ability_effects: {
    title: 'Изменение характеристик',
    idKey: 'ability',
    labels: abilityLabels,
    lockExisting: true,
    newRow: (value) => ({ ability: value, amount: 1, new_cap: null }),
  },
  skill_effects: {
    title: 'Владение навыками',
    idKey: 'skill_id',
    source: 'skills',
    newRow: (value) => ({ skill_id: value, grants_expertise: false }),
  },
  saving_throw_effects: {
    title: 'Проверки спасброска',
    idKey: 'ability',
    labels: abilityLabels,
    newRow: (value) => ({ ability: value }),
  },
  armor_effects: {
    title: 'Владение доспехами',
    idKey: 'armor_type',
    labels: armorProficiencyLabels,
    newRow: (value) => ({ armor_type: value }),
  },
  weapon_effects: {
    title: 'Владение оружием',
    idKey: 'weapon_category',
    labels: weaponProficiencyLabels,
    matches: (row) => row.item_id == null,
    newRow: (value) => ({ weapon_category: value, item_id: null }),
  },
}

export const hasRowsPicker = (effectType) => Object.hasOwn(ROW_PICKERS, effectType)
