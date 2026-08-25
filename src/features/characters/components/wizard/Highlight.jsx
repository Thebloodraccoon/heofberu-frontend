import { highlightParts } from './useSearch.js'

export default function Highlight({ text, query }) {
  const parts = highlightParts(text, query)
  return (
    <>
      {parts.map((p, i) =>
        p.match ? (
          <mark key={i} className="rounded bg-ember/25 px-0.5 text-inherit">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  )
}
