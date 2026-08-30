import { ErrorBox, Modal, Skeleton } from '@/components/ui'
import { useItemDetail } from '@/features/catalog/queries.js'
import ItemDetailCard from './ItemDetailCard.jsx'

export default function ItemInfoModal({ itemId, onClose }) {
  const detailQ = useItemDetail(itemId)

  return (
    <Modal
      title="Предмет"
      subtitle={detailQ.data?.name}
      onClose={onClose}
      size="4xl"
      scroll
    >
      {detailQ.error ? (
        <ErrorBox error={detailQ.error} onRetry={() => detailQ.refetch()} />
      ) : !detailQ.data ? (
        <div className="space-y-3 p-2" aria-busy="true">
          <Skeleton className="h-8 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : (
        <ItemDetailCard item={detailQ.data} />
      )}
    </Modal>
  )
}
