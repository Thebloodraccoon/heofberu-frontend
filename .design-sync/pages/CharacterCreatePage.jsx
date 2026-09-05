// Design-sync reference composition — NOT the real app page (that fetches
// catalog data live via useRaces/useClasses/useBackgrounds/useSkills + a
// cluster of per-selection detail hooks in
// src/features/characters/pages/CharacterCreatePage.jsx). This file
// reproduces the wizard's shell/derived-value logic with the SAME real Step
// components, backed by a small hand-authored mock catalog instead of a
// network fetch, with an `initialStep` prop so every step can be previewed.
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { POINT_BUY_MIN, STATS, bonusMap, effectiveTotals, pointCost, POINT_BUY_BUDGET } from '@/lib/utils/ability.js'
import { STEPS, DEFAULT_FORM } from '@/lib/utils/characterCreate.js'
import { Button, Card, PageHeader } from '@/components/ui'
import StepAbilities from '@/features/characters/components/wizard/StepAbilities.jsx'
import StepBackground from '@/features/characters/components/wizard/StepBackground.jsx'
import StepClass from '@/features/characters/components/wizard/StepClass.jsx'
import StepEquipment from '@/features/characters/components/wizard/StepEquipment.jsx'
import StepName from '@/features/characters/components/wizard/StepName.jsx'
import StepRace from '@/features/characters/components/wizard/StepRace.jsx'
import StepSkills from '@/features/characters/components/wizard/StepSkills.jsx'
import StepSummary from '@/features/characters/components/wizard/StepSummary.jsx'
import RollToasts from '@/features/characters/components/wizard/RollToasts.jsx'

// ---- mock reference catalog (kept internally consistent across steps) ----

const SKILLS_CATALOG = [
  { id: 1, name: 'Атлетика', ability: 'STR' },
  { id: 2, name: 'Акробатика', ability: 'DEX' },
  { id: 3, name: 'Ловкость рук', ability: 'DEX' },
  { id: 4, name: 'Скрытность', ability: 'DEX' },
  { id: 5, name: 'Магия', ability: 'INT' },
  { id: 6, name: 'История', ability: 'INT' },
  { id: 7, name: 'Расследование', ability: 'INT' },
  { id: 8, name: 'Природа', ability: 'INT' },
  { id: 9, name: 'Религия', ability: 'INT' },
  { id: 10, name: 'Обращение с животными', ability: 'WIS' },
  { id: 11, name: 'Проницательность', ability: 'WIS' },
  { id: 12, name: 'Медицина', ability: 'WIS' },
  { id: 13, name: 'Восприятие', ability: 'WIS' },
  { id: 14, name: 'Выживание', ability: 'WIS' },
  { id: 15, name: 'Обман', ability: 'CHA' },
  { id: 16, name: 'Запугивание', ability: 'CHA' },
  { id: 17, name: 'Выступление', ability: 'CHA' },
  { id: 18, name: 'Убеждение', ability: 'CHA' },
]

const RACES = [
  { id: 1, name: 'Дворф', speed: 25, size: 'MEDIUM', ability_bonuses: [{ ability: 'CON', bonus: 2 }] },
  { id: 2, name: 'Эльф', speed: 30, size: 'MEDIUM', ability_bonuses: [{ ability: 'DEX', bonus: 2 }] },
]
const RACE_DETAILS = {
  1: { name: 'Дворф', speed: 25, size: 'MEDIUM', ability_bonuses: [{ ability: 'CON', bonus: 2 }], subraces: [{ id: 11, name: 'Дворф-горец' }, { id: 12, name: 'Дворф-холмовик' }] },
  2: { name: 'Эльф', speed: 30, size: 'MEDIUM', ability_bonuses: [{ ability: 'DEX', bonus: 2 }], subraces: [{ id: 21, name: 'Высший эльф' }] },
}
const RACE_FEATURES = {
  1: [
    { id: 101, name: 'Тёмное зрение', description: 'Вы видите в темноте на расстоянии 18 метров, как при тусклом свете.' },
    { id: 102, name: 'Стойкость дворфов', description: 'Преимущество на спасброски против яда, и сопротивление к урону ядом.' },
  ],
  2: [
    { id: 103, name: 'Тёмное зрение', description: 'Вы видите в темноте на расстоянии 18 метров, как при тусклом свете.' },
    { id: 104, name: 'Транс', description: 'Не нуждаетесь в сне — медитируете 4 часа вместо этого.' },
  ],
}
const SUBRACE_DETAILS = {
  11: { name: 'Дворф-горец', speed: 25, ability_bonuses: [{ ability: 'STR', bonus: 2 }], features: [{ id: 111, name: 'Боевое обучение дворфов', description: 'Владение боевым топором, ручным топором, лёгким и боевым молотом.' }] },
  12: { name: 'Дворф-холмовик', ability_bonuses: [{ ability: 'WIS', bonus: 1 }], features: [{ id: 112, name: 'Кузнечное дело', description: 'Владение инструментами кузнеца.' }] },
  21: { name: 'Высший эльф', ability_bonuses: [{ ability: 'INT', bonus: 1 }], features: [{ id: 113, name: 'Заклинания высшего эльфа', description: 'Знаете один заговор волшебника на выбор.' }] },
}

const BACKGROUNDS = [{ id: 1, name: 'Солдат' }, { id: 2, name: 'Отшельник' }]
const BACKGROUND_DETAILS = {
  1: {
    name: 'Солдат',
    granted_skills: [{ id: 1, name: 'Атлетика' }, { id: 16, name: 'Запугивание' }],
    features: [{ id: 201, name: 'Военное звание', description: 'Солдаты признают ваше звание и подчиняются приказам, если это не грозит трибуналом.' }],
    starting_items: [{ item_id: 1, quantity: 1, item: { name: 'Знак воинского отличия' } }],
    starting_choice_groups: [{ pick_count: 1, options: [
      { id: 501, item_id: 10, item: { name: 'Игральные кости' } },
      { id: 502, item_id: 11, item: { name: 'Набор для игры в карты' } },
    ] }],
  },
  2: {
    name: 'Отшельник',
    granted_skills: [{ id: 12, name: 'Медицина' }, { id: 9, name: 'Религия' }],
    features: [{ id: 202, name: 'Открытие отшельника', description: 'Через уединение и медитацию вы обрели важное духовное откровение.' }],
    starting_items: [],
    starting_choice_groups: [],
  },
}

const CLASSES = [{ id: 1, name: 'Воин', hit_dice: 'D10' }, { id: 2, name: 'Волшебник', hit_dice: 'D6' }]
const CLASS_DETAILS = {
  1: {
    name: 'Воин',
    hit_dice: 'D10',
    subclasses: [{ id: 11, name: 'Мистический рыцарь' }, { id: 12, name: 'Чемпион' }],
    spellcasting_ability: 'INT',
    saving_throws: [{ ability: 'STR' }, { ability: 'CON' }],
    armor_proficiencies: [{ armor_type: 'LIGHT' }, { armor_type: 'MEDIUM' }, { armor_type: 'HEAVY' }, { armor_type: 'SHIELD' }],
    weapon_proficiencies: [{ weapon_category: 'SIMPLE' }, { weapon_category: 'MARTIAL' }],
    skill_choice_count: 2,
    available_skills: [
      { id: 1, name: 'Атлетика', ability: 'STR' },
      { id: 16, name: 'Запугивание', ability: 'CHA' },
      { id: 13, name: 'Восприятие', ability: 'WIS' },
      { id: 6, name: 'История', ability: 'INT' },
    ],
    starting_items: [{ item_id: 20, quantity: 1, item: { name: 'Кольчуга' } }],
    starting_choice_groups: [{ pick_count: 1, options: [
      { id: 601, item_id: 21, item: { name: 'Боевой топор' } },
      { id: 602, item_id: 22, item: { name: 'Длинный меч' } },
    ] }],
  },
  2: {
    name: 'Волшебник',
    hit_dice: 'D6',
    subclasses: [{ id: 21, name: 'Преображение' }],
    spellcasting_ability: 'INT',
    saving_throws: [{ ability: 'INT' }, { ability: 'WIS' }],
    armor_proficiencies: [],
    weapon_proficiencies: [{ weapon_category: 'SIMPLE' }],
    skill_choice_count: 2,
    available_skills: [{ id: 5, name: 'Магия', ability: 'INT' }, { id: 7, name: 'Расследование', ability: 'INT' }],
    starting_items: [],
    starting_choice_groups: [],
  },
}
const SUBCLASS_DETAILS = {
  11: { name: 'Мистический рыцарь', features: [{ id: 301, name: 'Заклинания мистического рыцаря', description: 'Изучаете заклинания волшебника, в основном школ ограждения и воплощения.' }] },
  12: { name: 'Чемпион', features: [{ id: 302, name: 'Превосходный критический удар', description: 'Ваши атаки оружием критикуют при выпадении 19 или 20 на кубике атаки.' }] },
  21: { name: 'Преображение', features: [{ id: 303, name: 'Ученик воплощения', description: 'Дополнительный заговор воплощения и увеличенный урон заговорами.' }] },
}

const ITEMS_CATALOG = [
  { id: 1, name: 'Знак воинского отличия' },
  { id: 10, name: 'Игральные кости' },
  { id: 11, name: 'Набор для игры в карты' },
  { id: 20, name: 'Кольчуга' },
  { id: 21, name: 'Боевой топор' },
  { id: 22, name: 'Длинный меч' },
]

const makeMockForm = () => ({
  ...DEFAULT_FORM,
  name: 'Тордек Крепкорукий',
  race_id: 1,
  subrace_id: 11,
  background_id: 1,
  class_id: 1,
  subclass_id: 11,
  ability_method: 'array',
  ability_base: { strength: 15, dexterity: 14, constitution: 13, wisdom: 12 },
  class_skill_ids: [16],
  // key = `${source}:${gi}` where gi is the index within the COMBINED
  // [...classGroups, ...backgroundGroups] array (see StepEquipment.jsx /
  // StepSummary.jsx) — not per-source. One group each here, so class group
  // lands at index 0 and the background group at index 1.
  starting_choices: { 'class:0': [601], 'background:1': [501] },
})

function seedQueryClient(qc) {
  qc.setQueryData(queryKeys.catalog.items({}), ITEMS_CATALOG)
}

const STEP_COMPONENTS = {
  name: StepName,
  race: StepRace,
  background: StepBackground,
  class: StepClass,
  skills: StepSkills,
  abilities: StepAbilities,
  equipment: StepEquipment,
  summary: StepSummary,
}

function Wizard({ initialStep }) {
  const [step, setStep] = useState(() => Math.max(0, STEPS.findIndex((s) => s.id === initialStep)))
  const [form, setForm] = useState(makeMockForm)
  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  const raceDetail = RACE_DETAILS[form.race_id]
  const raceFeatures = RACE_FEATURES[form.race_id] ?? []
  const subraceDetail = form.subrace_id ? SUBRACE_DETAILS[form.subrace_id] : null
  const classDetail = CLASS_DETAILS[form.class_id]
  const subclassDetail = form.subclass_id ? SUBCLASS_DETAILS[form.subclass_id] : null
  const backgroundDetail = BACKGROUND_DETAILS[form.background_id]

  const lookups = {
    races: RACES, classes: CLASSES, backgrounds: BACKGROUNDS, skills: SKILLS_CATALOG,
    raceDetail, raceFeatures, subraceDetail, subraceFeatures: subraceDetail?.features ?? [],
    classDetail, subclassDetail, backgroundDetail,
  }

  const bonusByCode = { ...bonusMap(raceDetail?.ability_bonuses), ...bonusMap(subraceDetail?.ability_bonuses) }
  const totals = effectiveTotals(
    Object.fromEntries(STATS.map((s) => [s.key, form.ability_base[s.key] ?? 8])),
    bonusByCode,
  )
  const dieSides = classDetail?.hit_dice ? Number(String(classDetail.hit_dice).replace('D', '')) : 8
  const derived = { bonusByCode, totals, dieSides }

  const canContinue = (() => {
    switch (STEPS[step].id) {
      case 'name': return Boolean(form.name.trim())
      case 'race': return Boolean(form.race_id)
      case 'class': return Boolean(form.class_id)
      case 'skills': return (form.class_skill_ids ?? []).length >= (classDetail?.skill_choice_count ?? 0)
      case 'abilities': {
        const allAssigned = STATS.every((s) => {
          const v = Number(form.ability_base[s.key])
          return Number.isFinite(v) && v >= 3 && v <= 18
        })
        if (form.ability_method === 'pointbuy') {
          const spent = STATS.reduce((sum, s) => sum + pointCost(Number(form.ability_base[s.key]) || POINT_BUY_MIN), 0)
          return allAssigned && POINT_BUY_BUDGET - spent >= 0
        }
        return allAssigned
      }
      default: return true
    }
  })()

  const renderStep = () => {
    const Step = STEP_COMPONENTS[STEPS[step].id]
    return <Step stepNo={step + 1} total={STEPS.length} form={form} update={update} lookups={lookups} derived={derived} isGM={false} onRoll={() => {}} />
  }

  return (
    <div>
      <div className="mb-4">
        <span className="text-sm text-ember">← Назад к персонажам</span>
      </div>
      <PageHeader title="Новый персонаж" />
      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden lg:block lg:sticky lg:top-6 lg:self-start">
          <ol className="space-y-1">
            {STEPS.map((s, i) => {
              const done = i < step
              const current = i === step
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                      current ? 'bg-ember/10 text-stone-100' : done ? 'text-stone-300 hover:bg-stone-800/60' : 'text-stone-600'
                    }`}
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                        current ? 'border-ember bg-ember text-white' : done ? 'border-ember/50 text-ember' : 'border-stone-700 text-stone-500'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span className="text-sm font-medium">{s.title}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </aside>

        <div className="min-w-0">
          <Card className="overflow-hidden !p-0">
            <div className="px-5 py-5 sm:px-5 sm:py-5">{renderStep()}</div>
            <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-stone-700/40 px-[10px] py-4 backdrop-blur sm:px-10 sm:py-5">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(s - 1, 0))}>
                ← Назад
              </Button>
              {step < STEPS.length - 1 ? (
                <Button disabled={!canContinue} onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}>
                  Далее →
                </Button>
              ) : (
                <Button disabled>Создать персонажа</Button>
              )}
            </div>
          </Card>
        </div>
      </div>
      <RollToasts toasts={[]} onDismiss={() => {}} />
    </div>
  )
}

/**
 * The character-creation wizard: 8 steps (name, race, background, class,
 * skills, abilities, equipment, summary) with a step sidebar and a shared
 * card frame. `initialStep` picks which step id to open on
 * ('name'|'race'|'background'|'class'|'skills'|'abilities'|'equipment'|'summary').
 */
export function CharacterCreatePage({ initialStep = 'name' }) {
  const [queryClient] = useState(() => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60000, retry: false } } })
    seedQueryClient(qc)
    return qc
  })
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Wizard initialStep={initialStep} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}
