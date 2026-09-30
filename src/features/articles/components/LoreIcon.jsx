const paths = {
  plus: 'M12 5v14M5 12h14',
  search: 'm21 21-4.5-4.5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',
  filter: 'M4 7h16M7 12h10M10 17h4',
  sort: 'M4 6h10M4 12h7M4 18h4M19 6v12m-3-3 3 3 3-3',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  back: 'M19 12H5m6-6-6 6 6 6',
  close: 'm6 6 12 12M18 6 6 18',
  check: 'm5 12 4 4L19 6',
  edit: 'm16 4 4 4-11 11-4 1 1-4L17 5a2 2 0 0 1 3 3',
  trash: 'M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6',
  undo: 'M9 4 4 9l5 5M4 9h10a6 6 0 0 1 0 12',
  chevron: 'm9 6 6 6-6 6',
}

export default function LoreIcon({ name, className = '' }) {
  return <svg className={`lore-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
