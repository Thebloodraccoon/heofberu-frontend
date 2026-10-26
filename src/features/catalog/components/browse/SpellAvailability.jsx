import { sentenceCase } from '@/lib/i18n/index.js'
import { Section, SkillChips } from './detail/detailHelpers.jsx'

// Подкласс/подраса приходят с родителем ({ id, name, class_id | race_id }) — карточка
// открывается через него: /catalog/classes/{class_id}?sub={id}.
export default function SpellAvailability({ spell }) {
  const groups = [
    ['Классы', spell.available_classes, (x) => `/catalog/classes/${x.id}`],
    ['Подклассы', spell.available_subclasses, (x) => `/catalog/classes/${x.class_id}?sub=${x.id}`],
    ['Расы', spell.available_races, (x) => `/catalog/races/${x.id}`],
    ['Подрасы', spell.available_subraces, (x) => `/catalog/races/${x.race_id}?sub=${x.id}`],
  ].filter(([, list]) => (list ?? []).length > 0)

  if (groups.length === 0) return null

  return (
    <Section title="Доступно">
      {groups.map(([name, list, href]) => (
        <p key={name} className="mt-2 flex flex-wrap items-center gap-2 text-sm leading-relaxed">
          <span className="font-semibold text-stone-100">{name}: </span>
          <SkillChips names={list.map((x) => ({ ...x, __name: sentenceCase(x.name.trim()) }))} hrefOf={href} />
        </p>
      ))}
    </Section>
  )
}
