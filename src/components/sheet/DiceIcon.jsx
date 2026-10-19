function Shape({ sides }) {
  return <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false"><use href={`/dice/d${sides}.svg#dice`} /></svg>
}

export default function DiceIcon({ sides, className = '' }) {
  return (
    <span className={`dice-icon ${sides === 100 ? 'dice-icon--percentile' : ''} ${className}`} aria-hidden="true">
      {sides === 100 ? <><Shape sides={10} /><Shape sides={10} /></> : <Shape sides={sides} />}
    </span>
  )
}
