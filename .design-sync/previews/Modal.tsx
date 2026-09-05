import { Button, Modal } from 'heofberu-ui'

export const Default = () => (
  <Modal title="Фильтр" subtitle="Настройте отображаемые записи" onClose={() => {}}>
    <p className="text-body">Содержимое фильтра появится здесь.</p>
  </Modal>
)

export const WithFooter = () => (
  <Modal
    title="Новый предмет"
    onClose={() => {}}
    footer={
      <>
        <Button variant="ghost" onClick={() => {}}>Отмена</Button>
        <Button onClick={() => {}}>Сохранить</Button>
      </>
    }
  >
    <p className="text-body">Заполните форму предмета.</p>
  </Modal>
)
