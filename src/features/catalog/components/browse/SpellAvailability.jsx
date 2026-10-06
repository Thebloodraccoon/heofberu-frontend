import { useQueries } from '@tanstack/react-query'
import { catalogApi } from '@/features/catalog/api.js'
import { sentenceCase } from '@/lib/i18n/index.js'
import { Section, SkillChips } from './detail/detailHelpers.jsx'

// Подкласс/подраса в заклинании приходят как { id, name } без родителя, а карточка
// открывается через родителя (/catalog/classes/{class_id}?sub={id}) — родителя
// берём из детали подкласса/подрасы. Пока она грузится, пункт показан без ссылки.
function useParentIds(list, fetchDetail, parentKey) {
  return useQueries({
    queries: (list ?? []).map((x) => ({
      queryKey: ['catalog', 'sub-parent', parentKey, x.id],
      queryFn: () => fetchDetail(x.id),
      select: (detail) => detail?.[parentKey],
      staleTime: Infinity,
    })),
  }).map((q) => q.data)
}

export default function SpellAvailability({ spell }) {
  const subclassParents = useParentIds(spell.available_subclasses, (id) => catalogApi.classes.subclasses.get(null, id), 'class_id')
  const subraceParents = useParentIds(spell.available_subraces, (id) => catalogApi.races.subraces.get(null, id), 'race_id')

  const groups = [
    ['Классы', spell.available_classes, (x) => `/catalog/classes/${x.id}`],
    ['Подклассы', spell.available_subclasses, (x, i) => subclassParents[i] && `/catalog/classes/${subclassParents[i]}?sub=${x.id}`],
    ['Расы', spell.available_races, (x) => `/catalog/races/${x.id}`],
    ['Подрасы', spell.available_subraces, (x, i) => subraceParents[i] && `/catalog/races/${subraceParents[i]}?sub=${x.id}`],
  ].filter(([, list]) => (list ?? []).length > 0)

  if (groups.length === 0) return null

  return (
    <Section title="Доступно">
      {groups.map(([name, list, href]) => (
        <p key={name} className="mt-2 flex flex-wrap items-center gap-2 text-sm leading-relaxed">
          <span className="font-semibold text-stone-100">{name}: </span>
          <SkillChips names={list.map((x) => ({ id: x.id, __name: sentenceCase(x.name.trim()) }))} hrefOf={href} />
        </p>
      ))}
    </Section>
  )
}
