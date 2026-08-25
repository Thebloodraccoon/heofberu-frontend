import { Badge } from '@/components/ui'

export default function SpellAvailability({ spell }) {
  const groups = [
    ['Классы', spell.available_classes],
    ['Подклассы', spell.available_subclasses],
    ['Расы', spell.available_races],
    ['Подрасы', spell.available_subraces],
  ].filter(([, list]) => (list ?? []).length > 0)

  if (groups.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wide text-stone-500">Доступно:</span>
      {groups.map(([name, list]) => (
        <Badge key={name} tone="dim" className="my-[3px]">
          {name}: {list.map((x) => x.name).join(', ')}
        </Badge>
      ))}
    </div>
  )
}
