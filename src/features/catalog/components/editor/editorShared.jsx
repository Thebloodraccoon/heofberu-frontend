import { Input, Select, TextArea } from '@/components/ui'

export function SectionTitle({ children }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">{children}</p>
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
