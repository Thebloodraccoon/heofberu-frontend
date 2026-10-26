import { Button } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'

export default function SheetDrawer({ title, children, onClose, footer, className = '', subtitle, bodyClassName }) {
  return (
    <Drawer title={title} subtitle={subtitle} onClose={onClose} closeLabel={`Закрыть: ${title}`} className={`character-sheet-drawer ${className}`} bodyClassName={bodyClassName} footer={footer ?? <Button variant="ghost" onClick={onClose}>Закрыть</Button>}>
      {children}
    </Drawer>
  )
}
