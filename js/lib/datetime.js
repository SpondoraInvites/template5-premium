// Pure date/time helpers — Intl-based, timezone-aware, no side effects.

export function formatEventDate(iso, timezone, locale) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  }).format(new Date(iso))
}

export function formatEventTime(iso, timezone, locale) {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  }).format(new Date(iso))
}

export function localizeNumber(value, locale) {
  const n = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
  return new Intl.NumberFormat(locale, { useGrouping: false }).format(n)
}

export function countdownParts(iso, nowMs = Date.now()) {
  let diff = Date.parse(iso) - nowMs
  const past = diff <= 0
  if (past) diff = 0
  const totalSeconds = Math.floor(diff / 1000)
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    past,
  }
}
