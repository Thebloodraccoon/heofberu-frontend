import { useQueryClient } from '@tanstack/react-query'
import { EditableBlock } from '@/components/sheet/primitives.jsx'
import { Skeleton } from '@/components/ui'
import { charactersApi } from '@/features/characters/api.js'
import { useBackstory } from '@/features/characters/queries.js'

const BACKSTORY_KEY = (id) => ['characters', Number(id), 'backstory']
const MAX_BACKSTORY_LENGTH = 12000

export default function BackstoryPanel({ characterId, onError }) {
  const queryClient = useQueryClient()
  const { data: content = '', isFetching } = useBackstory(characterId)

  const save = async (text) => {
    try {
      await charactersApi.backstory.set(characterId, { content: text })
      await queryClient.invalidateQueries({ queryKey: BACKSTORY_KEY(characterId) })
    } catch (e) {
      onError?.(e)
    }
  }

  if (isFetching && !content) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-56 w-full" />
      </div>
    )
  }

  return (
    <EditableBlock
      title="Предыстория"
      value={content}
      rows={12}
      maxLength={MAX_BACKSTORY_LENGTH}
      onSave={save}
    />
  )
}