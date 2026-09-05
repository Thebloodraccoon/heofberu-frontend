import { ConfirmDialog } from 'heofberu-ui'

export const Default = () => (
  <ConfirmDialog
    title="Удалить персонажа?"
    message="Тордек будет удалён без возможности восстановления."
    onCancel={() => {}}
    onConfirm={() => {}}
  />
)

export const Busy = () => (
  <ConfirmDialog
    title="Удалить предмет?"
    message="Это действие необратимо."
    busy
    onCancel={() => {}}
    onConfirm={() => {}}
  />
)
