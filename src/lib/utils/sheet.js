export const fmtBonus = (n) => {
  const v = Number(n ?? 0)
  return v > 0 ? `+${v}` : String(v)
}
