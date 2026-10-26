import { useState } from 'react'
import { Button, ErrorBox } from '@/components/ui'
import { useSyncItemEffects } from '@/features/catalog/queries.js'
import { normalizeEffects } from '@/lib/utils/featureEffects.js'
import { ArmorClassEffectsEditor, SpeedEffectsEditor, invalidSpeedRow } from './effectTypeEditors.jsx'

const pick = (bundle) => {
  const all = normalizeEffects(bundle)
  return { speed_effects: all.speed_effects, armor_class_effects: all.armor_class_effects }
}

// Эффекты, которые предмет даёт, пока надет (скорость и КД). Пишутся своими
// точечными запросами /items/{id}/effects (POST/DELETE, PATCH нет), а не
// автосохранением формы — поэтому своя кнопка «Сохранить эффекты».
// Общего заголовка нет — его называет вкладка («Влияние на КД и скорость»);
// у секций «Класс доспеха» / «Скорость» — свои названия слева и «+» справа.
export default function ItemEffectsEditor({ itemId, item }) {
  const sync = useSyncItemEffects(itemId)
  const [saved, setSaved] = useState(() => pick(item))
  const [draft, setDraft] = useState(saved)
  const saving = sync.isPending
  const error = sync.error
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft)
  const invalid = draft.speed_effects.some(invalidSpeedRow)

  const save = () =>
    sync.mutate(
      { prev: saved, next: draft },
      {
        onSuccess: (res) => {
          const next = res ? pick(res) : draft
          setSaved(next)
          setDraft(next)
        },
        // Часть запросов могла пройти: дальше считаем от того, что реально на
        // сервере (перечитано в useSyncItemEffects), а черновик ГМа не трогаем —
        // «Повторить» отправит только оставшуюся разницу.
        onError: (err) => {
          if (err?.latest) setSaved(pick(err.latest))
        },
      },
    )

  return (
    <div className="space-y-3">
      {dirty && (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="xs" onClick={() => setDraft(saved)} disabled={saving}>Отменить</Button>
          <Button type="button" size="xs" onClick={save} disabled={saving || invalid}>
            {saving ? 'Сохраняем…' : 'Сохранить эффекты'}
          </Button>
        </div>
      )}
      {error && <ErrorBox error={error} onRetry={save} />}
      <ArmorClassEffectsEditor rows={draft.armor_class_effects} onChange={(rows) => setDraft((d) => ({ ...d, armor_class_effects: rows }))} />
      <SpeedEffectsEditor rows={draft.speed_effects} onChange={(rows) => setDraft((d) => ({ ...d, speed_effects: rows }))} />
    </div>
  )
}
