import LoreIcon from '@/features/articles/components/LoreIcon.jsx'

export default function EditorAddButton({ children, className = '', ...props }) {
  const label = typeof children === 'string' ? children.replace(/^\+\s*/, '') : children
  return <button {...props} type="button" className={`catalog-add-button ${className}`}>
    <LoreIcon name="plus" />
    {label}
  </button>
}
