export const abilityLabels = {
  STR: 'Сила',
  DEX: 'Ловкость',
  CON: 'Телосложение',
  INT: 'Интеллект',
  WIS: 'Мудрость',
  CHA: 'Харизма',
}

export const abilityShort = {
  STR: 'СИЛ',
  DEX: 'ЛОВ',
  CON: 'ТЕЛ',
  INT: 'ИНТ',
  WIS: 'МДР',
  CHA: 'ХАР',
}

export const spellLevelLabels = {
  CANTRIP: 'Заговор',
  LEVEL_1: '1 уровень',
  LEVEL_2: '2 уровень',
  LEVEL_3: '3 уровень',
  LEVEL_4: '4 уровень',
  LEVEL_5: '5 уровень',
  LEVEL_6: '6 уровень',
  LEVEL_7: '7 уровень',
  LEVEL_8: '8 уровень',
  LEVEL_9: '9 уровень',
}

export const spellSchoolLabels = {
  ABJURATION: 'Ограждение',
  CONJURATION: 'Вызов',
  DIVINATION: 'Прорицание',
  ENCHANTMENT: 'Очарование',
  EVOCATION: 'Воплощение',
  ILLUSION: 'Иллюзия',
  NECROMANCY: 'Некромантия',
  TRANSMUTATION: 'Превращение',
}

export const spellCastTimeLabels = {
  ACTION: 'Действие',
  BONUS_ACTION: 'Бонусное действие',
  REACTION: 'Реакция',
  SPECIAL: 'Особое',
}

export const spellDurationLabels = {
  INSTANTANEOUS: 'Мгновенно',
  ONE_ROUND: '1 раунд',
  ONE_MINUTE: '1 минута',
  TEN_MINUTES: '10 минут',
  ONE_HOUR: '1 час',
  EIGHT_HOURS: '8 часов',
  TWENTY_FOUR_HOURS: '24 часа',
  SEVEN_DAYS: '7 дней',
  THIRTY_DAYS: '30 дней',
  UNTIL_DISPELLED: 'Пока не рассеяно',
  SPECIAL: 'Особо',
}

export const spellRangeLabels = {
  SELF: 'На себя',
  TOUCH: 'Касание',
  RANGED: 'Дистанция',
  SIGHT: 'В поле зрения',
  UNLIMITED: 'Неограниченно',
}

export const itemTypeLabels = {
  WEAPON: 'Оружие',
  ARMOR: 'Броня',
  SHIELD: 'Щит',
  POTION: 'Зелье',
  SCROLL: 'Свиток',
  WONDROUS_ITEM: 'Чудесный предмет',
  RING: 'Кольцо',
  ROD: 'Жезл',
  STAFF: 'Посох',
  WAND: 'Волшебная палочка',
  ADVENTURING_GEAR: 'Снаряжение',
  TOOL: 'Инструмент',
  AMMUNITION: 'Амуниция',
  TREASURE: 'Сокровище',
  OTHER: 'Прочее',
}

export const itemRarityLabels = {
  COMMON: 'Обычный',
  UNCOMMON: 'Необычный',
  RARE: 'Редкий',
  VERY_RARE: 'Очень редкий',
  LEGENDARY: 'Легендарный',
  ARTIFACT: 'Артефакт',
  NONE: 'Обычный',
}

export const raceSizeLabels = {
  TINY: 'Крошечный',
  SMALL: 'Маленький',
  MEDIUM: 'Средний',
  LARGE: 'Большой',
  HUGE: 'Огромный',
  GARGANTUAN: 'Гигантский',
}

export const attackTypeLabels = {
  MELEE_ATTACK: 'Рукопашная атака',
  RANGED_ATTACK: 'Дальнобойная атака',
}

export const damageTypeLabels = {
  SLASHING: 'Рубящий',
  PIERCING: 'Колющий',
  BLUDGEONING: 'Дробящий',
  ACID: 'Кислота',
  COLD: 'Холод',
  FIRE: 'Огонь',
  FORCE: 'Сила',
  LIGHTNING: 'Молния',
  NECROTIC: 'Некротический',
  POISON: 'Яд',
  PSYCHIC: 'Психический',
  RADIANT: 'Излучение',
  THUNDER: 'Гром',
}

export const componentLabels = {
  VERBAL: 'Вербальный',
  SOMATIC: 'Соматический',
  MATERIAL: 'Материальный',
}

export const healingTargetLabels = {
  HP: 'Здоровье',
  TEMP_HP: 'Временные хиты',
}

export const conditionLabels = {
  BLINDED: 'Ослеплён',
  CHARMED: 'Очарован',
  DEAFENED: 'Оглох',
  FRIGHTENED: 'Испуган',
  GRAPPLED: 'Схвачен',
  INCAPACITATED: 'Недееспособен',
  INVISIBLE: 'Невидим',
  PARALYZED: 'Парализован',
  PETRIFIED: 'Окаменел',
  POISONED: 'Отравлен',
  PRONE: 'Лежит ничком',
  RESTRAINED: 'Опутан',
  STUNNED: 'Ошеломлён',
  UNCONSCIOUS: 'Без сознания',
  EXHAUSTION: 'Истощение',
}

export const sourceTypeLabels = {
  CLASS: 'Класс',
  SUBCLASS: 'Подкласс',
  RACE: 'Раса',
  BACKGROUND: 'Предыстория',
  FEAT: 'Черта',
  OTHER: 'Прочее',
}

export const diceTypeLabels = {
  D4: 'к4',
  D6: 'к6',
  D8: 'к8',
  D10: 'к10',
  D12: 'к12',
  D20: 'к20',
  D100: 'к100',
}

export function ruLevel(level) {
  if (level == null || level === '') return ''
  return `${level}-й уровень`
}

export const roleLabels = {
  gm: 'Гейм-мастер',
  player: 'Игрок',
}

export const skillLabels = {
  acrobatics: 'Акробатика',
  animal_handling: 'Обращение с животными',
  arcana: 'Магия',
  athletics: 'Атлетика',
  deception: 'Обман',
  history: 'История',
  insight: 'Проницательность',
  intimidation: 'Запугивание',
  investigation: 'Расследование',
  medicine: 'Медицина',
  nature: 'Природа',
  perception: 'Восприятие',
  performance: 'Выступление',
  persuasion: 'Убеждение',
  religion: 'Религия',
  sleight_of_hand: 'Ловкость рук',
  stealth: 'Скрытность',
  survival: 'Выживание',
}

export const classSlugLabels = {
  barbarian: 'Варвар',
  bard: 'Бард',
  cleric: 'Жрец',
  druid: 'Друид',
  fighter: 'Воин',
  monk: 'Монах',
  paladin: 'Паладин',
  ranger: 'Следопыт',
  rogue: 'Плут',
  sorcerer: 'Чародей',
  warlock: 'Колдун',
  wizard: 'Волшебник',
}

export const fieldLabels = {
  hit_dice: 'Кость хитов',
  spell_ability: 'Характеристика заклинаний',
  spell_dc: 'КД спасброска заклинаний',
  spell_attack_bonus: 'Бонус атаки заклинаний',
  spell_level: 'Уровень заклинания',
  spell_school: 'Школа',
  spell_cast_time: 'Время накладывания',
  spell_duration: 'Длительность',
  spell_range_type: 'Дистанция',
  spell_range_value: 'Дистанция (значение)',
  spell_components: 'Компоненты',
  material_components: 'Материальные компоненты',
  spell_concentration: 'Концентрация',
  spell_ritual: 'Ритуал',
  item_type: 'Тип предмета',
  rarity: 'Редкость',
  attack_type: 'Тип атаки',
  damage_type: 'Тип урона',
  dice_type: 'Кость',
  dice_count: 'Количество костей',
  ability: 'Характеристика',
  size: 'Размер',
  speed: 'Скорость',
  skill_choice_count: 'Количество навыков',
  primary_abilities: 'Основные характеристики',
  saving_throws: 'Спасброски',
  available_skills: 'Доступные навыки',
  granted_skills: 'Навыки расы',
  ability_bonuses: 'Бонусы характеристик',
  proficiency_bonus: 'Бонус мастерства',
  armor_class: 'Класс доспеха',
  features: 'Свойства',
  prerequisite: 'Требования',
  prerequisite_ability: 'Требуемая характеристика',
  description: 'Описание',
  is_homebrew: 'Homebrew',
  cast_time: 'Время накладывания',
  range_type: 'Дистанция',
  range_value: 'Дистанция',
  duration: 'Длительность',
  is_concentration: 'Концентрация',
  is_ritual: 'Ритуал',
  damage_dice_count: 'Количество костей',
  damage_dice_type: 'Кость урона',
  available_classes: 'Классы',
  material: 'Материальные компоненты',
  healing_target: 'Объект лечения',
  healing_dice_count: 'Количество костей лечения',
  healing_dice_type: 'Кость лечения',
  level: 'Уровень',
  school: 'Школа',
  source: 'Источник',
  source_type: 'Источник',
  requires_attunement: 'Требует настройки',
  weight: 'Вес',
  cost_gold: 'Стоимость (золото)',
  weapon_properties: 'Свойства оружия',
  armor_class_base: 'Класс доспеха (базовый)',
  armor_class_dex_bonus: 'КД от Ловкости',
  armor_class_max_dex_bonus: 'Макс. КД от Ловкости',
  strength_requirement: 'Требование к Силе',
  stealth_disadvantage: 'Помеха на Скрытность',
  prerequisite_minimum_score: 'Минимальная характеристика',
  prerequisite_description: 'Описание требования',
  ability_score_increases: 'Увеличение характеристик',
  amount: 'Значение',
  bonus: 'Бонус',
  personality_traits_suggestions: 'Черты личности',
  ideals_suggestions: 'Идеалы',
  bonds_suggestions: 'Привязанности',
  flaws_suggestions: 'Слабости',
  available_subclasses: 'Подклассы',
  available_races: 'Доступно расам',
}

const maps = {
  ...abilityLabels,
  ...spellLevelLabels,
  ...spellSchoolLabels,
  ...spellCastTimeLabels,
  ...spellDurationLabels,
  ...spellRangeLabels,
  ...itemTypeLabels,
  ...itemRarityLabels,
  ...raceSizeLabels,
  ...attackTypeLabels,
  ...damageTypeLabels,
  ...componentLabels,
  ...healingTargetLabels,
  ...conditionLabels,
  ...sourceTypeLabels,
  ...diceTypeLabels,
  ...roleLabels,
  ...skillLabels,
  ...classSlugLabels,
  NONE: 'Нет',
}

export function label(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (maps[value] !== undefined) return maps[value]
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function fieldLabel(key) {
  if (fieldLabels[key]) return fieldLabels[key]
  return String(key)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
