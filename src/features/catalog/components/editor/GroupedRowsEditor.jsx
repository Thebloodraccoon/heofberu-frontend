import { useState } from 'react'
import Drawer from '@/components/ui/Drawer.jsx'
import { Button, RichText, RichTextEditor } from '@/components/ui'
import { groupRows, replaceGroupRows } from '@/lib/utils/groupedRows.js'
import EditorAddButton from './EditorAddButton.jsx'
import { PencilIcon, SectionTitle, TrashIcon } from './editorShared.jsx'

// Панель правки одной группы: строки текстом, у каждой «Редактировать» и «Удалить».
// Правка строки сохраняется своей кнопкой «Сохранить» (или «Отмена» у строки), удаление —
// сразу; «Добавить» открывает новую строку в правке. Внизу — только «Закрыть».
// onCommit(texts) отдаёт весь список группы наружу после каждого действия.
function GroupDrawer({ title, texts, onCommit, onClose }) {
  const [editing, setEditing] = useState(null) // { index, text }; index === texts.length — новая строка
  const rows = editing?.index === texts.length ? [...texts, editing.text] : texts
  const save = () => {
    const next = [...texts]
    next[editing.index] = editing.text
    onCommit(next)
    setEditing(null)
  }
  const remove = (i) => {
    onCommit(texts.filter((_, j) => j !== i))
    setEditing(null)
  }
  return (
    <Drawer
      title={title}
      subtitle="Порядок здесь — порядок в описании"
      closeLabel={`Закрыть: ${title}`}
      onClose={onClose}
      footer={<Button type="button" variant="ghost" onClick={onClose}>Закрыть</Button>}
    >
      <SectionTitle button={<EditorAddButton onClick={() => setEditing({ index: texts.length, text: '' })} aria-label="Добавить вариант">Добавить</EditorAddButton>}>
        Варианты <span className="text-stone-500">{texts.length}</span>
      </SectionTitle>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-stone-500">Вариантов нет</p>}
        {rows.map((text, i) => (
          <div key={i} className="flex items-start gap-2 rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
            {editing?.index === i ? (
              <>
                <RichTextEditor
                  value={editing.text}
                  onChange={(e) => setEditing({ index: i, text: e.target.value })}
                  rows={2}
                  className="min-h-0 min-w-0 flex-1"
                  ariaLabel={`${title}: вариант`}
                />
                <div className="flex shrink-0 flex-col gap-1">
                  <Button type="button" size="xs" onClick={save} disabled={!editing.text.trim()}>Сохранить</Button>
                  <Button type="button" variant="ghost" size="xs" onClick={() => setEditing(null)}>Отмена</Button>
                </div>
              </>
            ) : (
              <>
                <RichText value={text} className="min-w-0 flex-1 text-sm leading-relaxed" />
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => setEditing({ index: i, text })} className="inline-flex h-[36px] w-[36px] items-center justify-center rounded border border-stone-700 text-stone-300 transition hover:bg-stone-800" title="Редактировать" aria-label="Редактировать вариант">
                    <PencilIcon />
                  </button>
                  <button type="button" onClick={() => remove(i)} className="catalog-delete-button" title="Удалить" aria-label="Удалить вариант">
                    <TrashIcon />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </Drawer>
  )
}

// Список вариантов по группам (предложения предыстории: черты, идеалы…): в форме —
// только чтение, «Изменить» у группы открывает панель. Панель меняет form-список
// (replaceGroupRows) после каждого «Сохранить»/«Удалить», дальше его сохраняет обычный автосейв (submitFields).
export default function GroupedRowsEditor({ section, rows = [], onChange }) {
  const [open, setOpen] = useState(null) // group.value
  const openGroup = section.groups.find((g) => g.value === open)
  return (
    <div className="flex flex-col gap-5">
      {section.groups.map((group) => {
        const entries = groupRows(rows, section.groupKey, group.value)
        return (
          <div key={group.value}>
            <SectionTitle
              button={
                <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(group.value)} aria-label={`Изменить: ${group.label}`}>
                  Изменить
                </Button>
              }
            >
              {group.label}
            </SectionTitle>
            {entries.length === 0 ? (
              <p className="text-sm text-stone-500">{section.empty}</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-stone-700/60 bg-stone-900/60">
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th className="w-12 !text-center">{`к${entries.length}`}</th>
                      <th>{group.column ?? group.label}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((row, n) => (
                      <tr key={row.id ?? `new-${n}`}>
                        <td className="text-center">{n + 1}</td>
                        <td><RichText value={row[section.textKey] ?? ''} className="inline leading-relaxed" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
      {openGroup && (
        <GroupDrawer
          title={openGroup.label}
          texts={groupRows(rows, section.groupKey, openGroup.value).map((row) => row[section.textKey] ?? '')}
          onClose={() => setOpen(null)}
          onCommit={(texts) => onChange(replaceGroupRows(rows, section.groupKey, openGroup.value, section.textKey, texts))}
        />
      )}
    </div>
  )
}
