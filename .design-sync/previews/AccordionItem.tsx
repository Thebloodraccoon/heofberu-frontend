import { useState } from 'react'
import { AccordionItem } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, width: 360 }}>{children}</div>
)

export const Closed = () => {
  const [open, setOpen] = useState(false)
  return (
    <Shell>
      <AccordionItem
        open={open}
        onToggle={() => setOpen((o) => !o)}
        header={<p className="font-semibold text-sm text-stone-100">Тьмавидение</p>}
        bodyClassName="mt-1 px-[5px]"
      >
        <p className="text-body">Вы видите в темноте на расстоянии 18 метров, как при тусклом свете.</p>
      </AccordionItem>
    </Shell>
  )
}

export const Open = () => {
  const [open, setOpen] = useState(true)
  return (
    <Shell>
      <AccordionItem
        open={open}
        onToggle={() => setOpen((o) => !o)}
        header={<p className="font-semibold text-sm text-stone-100">Стойкость дворфов</p>}
        bodyClassName="mt-1 px-[5px]"
      >
        <p className="text-body">У вас есть преимущество на спасброски против яда, и вы получаете сопротивление к урону ядом.</p>
      </AccordionItem>
    </Shell>
  )
}
