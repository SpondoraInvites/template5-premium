// Locale application — swaps every visible/control string in place.
// Importantly this never touches animation state: the cover reveal is driven
// by transforms/opacity, so switching language mid-reveal never restarts it.

import { config } from './config.js'
import { formatEventDate, formatEventTime } from './lib/datetime.js'
import { buildGoogleCalendarUrl } from './lib/calendar.js'

export function translate(key, locale) {
  return config.i18n[locale]?.[key] ?? config.i18n[config.defaultLocale][key] ?? ''
}

export function applyLocale(locale) {
  document.documentElement.lang = locale
  document.title = translate('doc.title', locale)

  for (const el of document.querySelectorAll('[data-i18n]')) {
    // Only overwrite when a translation exists — the hardcoded HTML text is the
    // fallback (e.g. a visitor's cached config.js predating a new key must
    // never blank a label).
    const text = translate(el.dataset.i18n, locale)
    if (text) el.textContent = text
  }
  for (const el of document.querySelectorAll('[data-i18n-aria]')) {
    const label = translate(el.dataset.i18nAria, locale)
    if (label) el.setAttribute('aria-label', label)
  }
  for (const el of document.querySelectorAll('[data-i18n-alt]')) {
    const alt = translate(el.dataset.i18nAlt, locale)
    if (alt) el.setAttribute('alt', alt)
  }
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
    const ph = translate(el.dataset.i18nPlaceholder, locale)
    if (ph) el.setAttribute('placeholder', ph)
  }
  for (const el of document.querySelectorAll('[data-i18n-title]')) {
    const title = translate(el.dataset.i18nTitle, locale)
    if (title) el.setAttribute('title', title)
  }
  if (config.venue.mapEmbed) {
    for (const el of document.querySelectorAll('[data-map-embed]')) {
      el.src = config.venue.mapEmbed
    }
  }
  for (const el of document.querySelectorAll('[data-i18n-date]')) {
    el.textContent = formatEventDate(config.event.iso, config.event.timezone, locale)
  }
  for (const el of document.querySelectorAll('[data-i18n-time]')) {
    el.textContent = formatEventTime(config.event.iso, config.event.timezone, locale)
  }
  const calTitle = translate('details.eventTitle', locale)
  const location = `${translate('details.venueName', locale)}, ${translate('details.venueAddress', locale)}`
  for (const a of document.querySelectorAll('[data-href="calendar"]')) {
    a.href = buildGoogleCalendarUrl({ event: config.event, title: calTitle, location })
  }
  for (const a of document.querySelectorAll('[data-href="maps"]')) {
    a.href = config.venue.mapsUrl
  }
  for (const btn of document.querySelectorAll('[data-locale-btn]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.localeBtn === locale))
  }
  // Let live widgets (countdown digits, scroll triggers) re-render in place.
  document.dispatchEvent(new CustomEvent('invitation:locale', { detail: locale }))
}
