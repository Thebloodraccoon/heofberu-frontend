const paths = {
  dice: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM7 7h.01M17 7h.01M12 12h.01M7 17h.01M17 17h.01',
  settings: 'M4 7h16M4 17h16M8 4v6M16 14v6',
  levelUp: 'M12 20V4m-6 6 6-6 6 6',
  note: 'M5 5h14M5 10h14M5 15h9M5 20h9',
  book: 'M12 5v16M12 5C8 2 4 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-2-1-6-2-10 1Z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
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
  star: 'm12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L2.9 9.6l6.3-.9L12 3Z',
  pin: 'M12 17v5M9 3h6M9 3v5l-3 4v4h12v-4l-3-4V3M6 16h12',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 3v6h6M12 7v5l3 2',
}

export default function LoreIcon({ name, className = '' }) {
  return <svg className={`lore-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
