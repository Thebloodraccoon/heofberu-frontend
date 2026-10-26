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
  ONE_MINUTE: '1 минута',
  TEN_MINUTES: '10 минут',
  ONE_HOUR: '1 час',
  EIGHT_HOURS: '8 часов',
  TWELVE_HOURS: '12 часов',
  TWENTY_FOUR_HOURS: '24 часа',
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

// Вид предмета (kind) — задаётся при создании и не меняется.
export const itemKindLabels = {
  WEAPON: 'Оружие',
  ARMOR: 'Доспехи',
  TOOL: 'Инструменты',
  GEAR: 'Предметы',
}

// Что добавить в снаряжение (селект + «Добавить»): предмет какого вида выбрать.
export const itemKindPickLabels = {
  WEAPON: 'Оружие',
  ARMOR: 'Доспех',
  TOOL: 'Инструмент',
  GEAR: 'Предмет',
}

// Подтип прочего предмета (subtype, только у kind GEAR).
export const gearTypeLabels = {
  POTION: 'Зелье',
  SCROLL: 'Свиток',
  WONDROUS_ITEM: 'Чудесный предмет',
  RING: 'Кольцо',
  ROD: 'Жезл',
  STAFF: 'Посох',
  WAND: 'Волшебная палочка',
  ADVENTURING_GEAR: 'Снаряжение',
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
  NONE: 'Неопределено',
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
  SUBRACE: 'Подраса',
  BACKGROUND: 'Предыстория',
  FEAT: 'Черта',
  OTHER: 'Прочее',
}

export const armorProficiencyLabels = {
  LIGHT: 'Лёгкие доспехи',
  MEDIUM: 'Средние доспехи',
  HEAVY: 'Тяжёлые доспехи',
  SHIELD: 'Щит',
}

export const weaponProficiencyLabels = {
  SIMPLE: 'Простое оружие',
  MARTIAL: 'Воинское оружие',
}

// Категория доспеха у самого предмета (item.armor_category; щит — ARMOR + SHIELD).
export const armorCategoryLabels = {
  LIGHT: 'Лёгкий доспех',
  MEDIUM: 'Средний доспех',
  HEAVY: 'Тяжёлый доспех',
  SHIELD: 'Щит',
}

export const toolCategoryLabels = {
  ARTISAN: 'Инструменты ремесленника',
  MUSICAL_INSTRUMENT: 'Музыкальный инструмент',
  GAMING_SET: 'Игровой набор',
  VEHICLE: 'Транспорт',
  KIT: 'Набор',
}

// Фильтр «любой предмет такого-то вида» (вариант снаряжения без item_id,
// открытый выбор инструмента) — с согласованием рода. '' — без категории.
export const anyWeaponLabels = {
  '': 'любое оружие',
  SIMPLE: 'любое простое оружие',
  MARTIAL: 'любое воинское оружие',
}

export const anyArmorLabels = {
  '': 'любой доспех',
  LIGHT: 'любой лёгкий доспех',
  MEDIUM: 'любой средний доспех',
  HEAVY: 'любой тяжёлый доспех',
  SHIELD: 'любой щит',
}

export const anyToolLabels = {
  '': 'любой инструмент',
  ARTISAN: 'любые инструменты ремесленника',
  MUSICAL_INSTRUMENT: 'любой музыкальный инструмент',
  GAMING_SET: 'любой игровой набор',
  VEHICLE: 'любое транспортное средство',
  KIT: 'любой набор',
}

export const speedTypeLabels = {
  WALK: 'Ходьба',
  FLY: 'Полёт',
  SWIM: 'Плавание',
  CLIMB: 'Лазание',
  BURROW: 'Копание',
}

export const speedEffectModeLabels = {
  BONUS: 'Бонус',
  SET: 'Не меньше',
  EQUAL_TO_WALK: 'Равна скорости ходьбы',
  IGNORE_ARMOR_PENALTY: 'Тяжёлый доспех не замедляет',
}

export const armorClassModeLabels = {
  BONUS: 'Бонус к КД',
  FORMULA: 'Формула КД',
}

// Когда действует эффект скорости/КД («доспех» — нательный, щит не в счёт).
export const effectConditionLabels = {
  NONE: 'Всегда',
  WEARING_ARMOR: 'В доспехе',
  NO_ARMOR: 'Без доспеха',
  NO_HEAVY_ARMOR: 'Без тяжёлого доспеха',
  NO_ARMOR_NO_SHIELD: 'Без доспеха и щита',
}

// Что выбирал игрок в группе выбора — по типу эффектов варианта.
export const choiceKindLabels = {
  ability: 'Характеристика',
  skill: 'Навык',
  saving: 'Спасбросок',
  armor: 'Доспехи',
  weapon: 'Оружие',
  tool: 'Инструмент',
  spell: 'Заклинание',
  speed: 'Скорость',
  armor_class: 'КД',
}

// Что даёт эффект навыка (SkillEffectMode на бэке).
export const skillEffectModeLabels = {
  PROFICIENCY: 'Владение',
  PROFICIENCY_AND_EXPERTISE: 'Владение + экспертиза',
  EXPERTISE: 'Только экспертиза',
  UPGRADE: 'Владение или экспертиза',
}

// Пояснение к режиму под выбором — короткие подписи выше его не вмещают.
export const skillEffectModeHints = {
  PROFICIENCY: '',
  PROFICIENCY_AND_EXPERTISE: '',
  EXPERTISE: 'Нужно владение из другого источника',
  UPGRADE: 'Экспертиза, если владение уже есть',
}

// Короткая приписка к названию навыка в сводках эффектов.
export const skillEffectModeSuffix = {
  PROFICIENCY: '',
  PROFICIENCY_AND_EXPERTISE: ' (экспертиза)',
  EXPERTISE: ' (только экспертиза)',
  UPGRADE: ' (экспертиза, если уже владеете)',
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

export const weaponPropertyLabels = {
  AMMUNITION: 'Боеприпас',
  FINESSE: 'Фехтовальное',
  HEAVY: 'Тяжёлое',
  LIGHT: 'Лёгкое',
  LOADING: 'Заряжание',
  RANGE: 'Дальнобойное',
  REACH: 'Досягаемость',
  SPECIAL: 'Особое',
  THROWN: 'Метательное',
  TWO_HANDED: 'Двуручное',
  VERSATILE: 'Универсальное',
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
  kind: 'Вид предмета',
  subtype: 'Тип предмета',
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
  properties: 'Свойства оружия',
  magic_bonus: 'Магический бонус',
  weapon_category: 'Категория оружия',
  range_normal: 'Дистанция',
  range_long: 'Макс. дистанция',
  versatile_dice_count: 'Кости урона двумя руками',
  versatile_dice_type: 'Кость урона двумя руками',
  armor_category: 'Категория доспеха',
  tool_category: 'Вид инструмента',
  armor_class_base: 'Класс доспеха (базовый)',
  armor_class_max_dex_bonus: 'Макс. КД от Ловкости',
  strength_requirement: 'Требование к Силе',
  stealth_disadvantage: 'Помеха на Скрытность',
  prerequisite_minimum_score: 'Минимальная характеристика',
  prerequisite_description: 'Описание требования',
  ability_score_increases: 'Увеличение характеристик',
  amount: 'Значение',
  bonus: 'Бонус',
  starting_gold: 'Стартовое золото',
  available_subclasses: 'Подклассы',
  available_races: 'Доступно расам',
  armor_proficiencies: 'Владение доспехами',
  starting_items: 'Стартовое снаряжение',
  subraces: 'Подрасы',
  subrace_id: 'Подраса',
  subclass_id: 'Подкласс',
  quantity: 'Количество',
}

const maps = {
  ...abilityLabels,
  ...spellLevelLabels,
  ...spellSchoolLabels,
  ...spellCastTimeLabels,
  ...spellDurationLabels,
  ...spellRangeLabels,
  ...itemKindLabels,
  ...gearTypeLabels,
  ...itemRarityLabels,
  ...raceSizeLabels,
  ...attackTypeLabels,
  ...damageTypeLabels,
  ...componentLabels,
  ...healingTargetLabels,
  ...conditionLabels,
  ...sourceTypeLabels,
  ...armorProficiencyLabels,
  ...diceTypeLabels,
  ...weaponPropertyLabels,
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

// Первая буква заглавная, остальное — строчными (для имён из БД: «уход за животными» →
// «Уход за животными», «ЫАВПАВРПРАПР» → «Ывапаврпрапр»), независимо от исходного регистра.
export function sentenceCase(value) {
  if (value === null || value === undefined || value === '') return '—'
  const s = String(value)
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

export function fieldLabel(key) {
  if (fieldLabels[key]) return fieldLabels[key]
  return String(key)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export const articleTypeLabels = {
  lore: 'Лор',
  region: 'Регион',
  location: 'Локация',
  faction: 'Фракция',
  npc: 'НПС',
  event: 'Событие',
  artifact: 'Артефакт',
  deity: 'Божество',
  religion: 'Религия',
  creature: 'Существо',
  culture: 'Культура',
  language: 'Язык',
  document: 'Документ',
  condition: 'Состояние',
  quest: 'Квест',
  session: 'Сессия',
}

export const articleStatusLabels = {
  draft: 'Черновик',
  in_review: 'На проверке',
  published: 'Опубликовано',
  archived: 'В архиве',
}

// Переходы статуса статьи (кнопки редактора).
export const articleActionLabels = {
  submit: 'Отправить на проверку',
  publish: 'Опубликовать',
  reject: 'Вернуть в черновик',
  archive: 'В архив',
  restore: 'Восстановить из архива',
}

export const articleVisibilityLabels = {
  public: 'Публичная',
  gm_only: 'Только для ГМ',
}

export const relationTypeLabels = {
  LOCATED_IN: 'находится в',
  MEMBER_OF: 'состоит в',
  RULES: 'правит',
  PARENT_FACTION: 'дочерняя фракция от',
  ALLY_OF: 'союзник',
  ENEMY_OF: 'враг',
  RELATIVE_OF: 'родственник',
  MENTIONS: 'упоминает',
  SEE_ALSO: 'см. также',
  PARTICIPATED_IN: 'участвовал в',
}

// Подпись связанной статьи на странице статьи — кем она приходится текущей:
// outgoing — эта статья «находится в» X, incoming — X «находится в» этой статье.
// Подпись стоит на одной карточке, поэтому в единственном числе. У симметричных связей
// подпись одна для обеих сторон.
export const relationCaptionLabels = {
  LOCATED_IN: { outgoing: 'Находится в', incoming: 'Находится здесь' },
  MEMBER_OF: { outgoing: 'Состоит в', incoming: 'Член' },
  RULES: { outgoing: 'Правит', incoming: 'Правитель' },
  PARENT_FACTION: { outgoing: 'Родительская фракция', incoming: 'Дочерняя фракция' },
  PARTICIPATED_IN: { outgoing: 'Участвовал в', incoming: 'Участник' },
  ALLY_OF: { outgoing: 'Союзник', incoming: 'Союзник' },
  ENEMY_OF: { outgoing: 'Враг', incoming: 'Враг' },
  RELATIVE_OF: { outgoing: 'Родственник', incoming: 'Родственник' },
  MENTIONS: { outgoing: 'Упоминает', incoming: 'Упоминается в' },
  SEE_ALSO: { outgoing: 'Смотрите также', incoming: 'Смотрите также' },
}

export const articleChildCaption = 'Вложенная статья'
export const relatedArticlesLabel = 'Связанные статьи'

// Кампании: статусы игровой кампании, участия персонажа и сессии, публичной кампании (пресета).
export const campaignStatusLabels = {
  planning: 'Подготовка',
  active: 'Идёт',
  paused: 'На паузе',
  finished: 'Завершена',
  abandoned: 'Заброшена',
}

export const campaignCharacterStatusLabels = {
  active: 'В игре',
  dead: 'Погиб',
  retired: 'Ушёл на покой',
  removed: 'Исключён',
}

export const campaignSessionStatusLabels = {
  planned: 'Запланирована',
  played: 'Сыграна',
  cancelled: 'Отменена',
}

export const publicCampaignStatusLabels = {
  draft: 'Черновик',
  published: 'Опубликована',
  archived: 'В архиве',
}

// Насколько персонаж виден публично (карточка и витрина публичной кампании).
export const characterVisibilityLabels = {
  hidden: 'Скрыт',
  full: 'Открыт',
}
