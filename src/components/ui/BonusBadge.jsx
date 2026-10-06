export default function BonusBadge({ tone = 'dim', children }) {
  return <span className="bonus-badge" data-tone={tone}>{children}</span>
}
