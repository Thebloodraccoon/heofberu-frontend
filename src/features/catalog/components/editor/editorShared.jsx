import { Input, Select, TextArea } from '@/components/ui'

export function PencilIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  )
}

export function TrashIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  )
}

export function SectionTitle({ children, button }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">{children}</p>
      <span className="h-px flex-1 bg-stone-700/70" aria-hidden="true" />
      {button}
    </div>
  )
}

export default function EditorFieldControl({ field, value, onChange }) {
  if (field.type === 'textarea') {
    return (
      <TextArea
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
        rows={field.rows ?? 4}
      />
    )
  }
  if (field.type === 'number') {
    return <Input type="number" min={field.min} max={field.max} value={value} onChange={onChange} />
  }
  if (field.type === 'select') {
    return (
      <Select value={value} onChange={onChange}>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    )
  }
  return (
    <Input
      value={value}
      onChange={onChange}
      placeholder={field.placeholder}
      required={field.required}
    />
  )
}
