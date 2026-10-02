// Маркеры, которые бэк пишет в merged_body на месте конфликта (как git diff3).
const MARKER_RE = /^(<{7} |\|{7} |={7}$|>{7} )/m

export const hasConflictMarkers = (text) => MARKER_RE.test(text ?? '')

// 409 от rebase / accept?rebase=true: конфликты лежат в error.details (общая обёртка ошибок бэка).
// null — 409 по другой причине (предложение уже закрыто).
export const mergeConflicts = (e) => {
  const details = e?.status === 409 ? e.data?.error?.details : null
  return details?.conflicts || details?.body_conflicts ? details : null
}

// Неконфликтное поле: менялось в предложении — берём предложенное, иначе текущее.
export const mergeField = (base, current, proposed) => ((proposed ?? null) !== (base ?? null) ? proposed : current)
