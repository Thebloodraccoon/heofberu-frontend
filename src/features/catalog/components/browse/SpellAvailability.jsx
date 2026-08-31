import { Badge } from '@/components/ui'
import { Section } from './detail/detailHelpers.jsx'

export default function SpellAvailability({ spell }) {
  const groups = [
    ['Классы', spell.available_classes],
    ['Подклассы', spell.available_subclasses],
    ['Расы', spell.available_races],
    ['Подрасы', spell.available_subraces],
  ].filter(([, list]) => (list ?? []).length > 0)

  if (groups.length === 0) return null

  return (
    <Section title="Доступно">
      <div className="flex flex-wrap gap-1.5">
        {groups.map(([name, list]) => (
          <Badge key={name} tone="default" className="my-[5px]">
            {name}: {list.map((x) => x.name).join(', ')}
          </Badge>
        ))}
      </div>
    </Section>
  )
}
