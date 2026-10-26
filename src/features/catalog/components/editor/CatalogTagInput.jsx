import TagInput from '@/features/articles/components/TagInput.jsx'
import EditorAddButton from './EditorAddButton.jsx'
import { SectionTitle } from './editorShared.jsx'

// Теги записи справочника: шапка как у особенностей — «Теги N» и «Добавить».
export default function CatalogTagInput(props) {
  return (
    <TagInput
      {...props}
      header={({ count, open }) => (
        <SectionTitle button={<EditorAddButton onClick={open} aria-label="Добавить теги">Добавить</EditorAddButton>}>
          Теги <span className="text-stone-500">{count}</span>
        </SectionTitle>
      )}
    />
  )
}
