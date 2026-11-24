const MASK = '•••••'

// Order matters: the most specific patterns run first.
const PATTERNS: RegExp[] = [
  // API keys and tokens
  /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}/g,
  /\b(?:ghp|gho|ghu|ghs|github_pat|xox[abpr]|glpat|npm|AKIA|ASIA)[_-]?[A-Za-z0-9_-]{12,}/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  /\b(Bearer|token|apikey|api_key|secret|password|passwd)(["']?\s*[:=]\s*["']?|\s+)[^\s"',]{6,}/gi,
  // Email
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  // IBAN (TR and others)
  /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g,
  // Credit card: 13-19 digits, spaces or dashes allowed
  /\b\d(?:[ -]?\d){12,18}\b/g,
  // Money: symbol before or currency after the number
  /[₺$€£]\s?\d[\d.,]*/g,
  /\b\d[\d.,]*\s?(?:TL|TRY|USD|EUR|GBP|₺|\$|€|£)(?![A-Za-z])/g,
  // Phone: +90 5xx xxx xx xx, 0 5xx ..., generic international
  /(?:\+\d{1,3}[ -]?)?\(?0?\d{3}\)?[ -]?\d{3}[ -]?\d{2}[ -]?\d{2}\b/g,
]

export const redact = (text: string): string =>
  PATTERNS.reduce(
    (out, re) =>
      out.replace(re, (...args: unknown[]) =>
        // Only the keyword pattern has groups: keep "Bearer " / "token=", hide the value.
        typeof args[1] === 'string' && typeof args[2] === 'string' ? `${args[1]}${args[2]}${MASK}` : MASK,
      ),
    text,
  )

// Rewrites every string inside a value; the shape stays the same.
export const redactDeep = (value: unknown): unknown => {
  if (typeof value === 'string') return redact(value)
  if (Array.isArray(value)) return value.map(redactDeep)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactDeep(v)]))
  }
  return value
}
