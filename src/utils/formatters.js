/**
 * Format a raw NHL season integer to a readable string.
 * 20242025 → "2024-25"
 */
export function formatSeason(season) {
  const s = String(season)
  return `${s.slice(0, 4)}-${s.slice(6)}`
}

/**
 * Calculate age from a birth date string.
 * "1997-01-13" → 29
 */
export function calcAge(birthDate) {
  if (!birthDate) return null
  return Math.floor(
    (Date.now() - new Date(birthDate).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
  )
}

/**
 * Format height in inches to feet and inches.
 * 73 → "6'1\""
 */
export function formatHeight(inches) {
  if (!inches) return ''
  return `${Math.floor(inches / 12)}'${inches % 12}"`
}

/**
 * Format a game date string to a short label.
 * "2026-04-04" → "Apr 4"
 * Uses noon UTC to avoid day-off-by-one timezone issues.
 */
export function formatGameDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Safely extract a player name, handling the API's {default: "..."} object shape.
 */
export function formatName(first, last) {
  const f = typeof first === 'object' && first !== null ? first.default : first
  const l = typeof last === 'object' && last !== null ? last.default : last
  return `${f ?? ''} ${l ?? ''}`.trim()
}

/**
 * Format a +/- value with explicit plus sign.
 * 5 → "+5", -3 → "-3", 0 → "0"
 */
export function formatPlusMinus(value) {
  if (value == null) return '—'
  return value > 0 ? `+${value}` : String(value)
}

/**
 * Safely extract a string from an NHL locale object or plain string.
 * { default: "Oilers" } → "Oilers"
 */
export function extractStr(val) {
  if (!val) return ''
  if (typeof val === 'object') return val.default ?? ''
  return val
}
