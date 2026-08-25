import { ErrorBox, Modal, Spinner } from '@/components/ui'
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
        <div className="py-8 text-center">
          <Spinner />
        </div>
      ) : (
        <ItemDetailCard item={detailQ.data} />
      )}
    </Modal>
  )
}
