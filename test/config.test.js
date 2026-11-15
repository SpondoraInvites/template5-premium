import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { INVITE_CONFIG, INVITE_TRANSLATIONS } from '../config.js'
import { enFromConfig, bnFromConfig, LOCALES } from '../js/i18n.js'

function dictionaries() {
  const all = { en: enFromConfig(INVITE_CONFIG) }
  for (const [locale, tree] of Object.entries(INVITE_TRANSLATIONS)) {
    all[locale] = bnFromConfig(tree)
  }
  return all
}

test('event timestamp parses and lies in the future', () => {
  const t = Date.parse(INVITE_CONFIG.weddingDateTime)
  assert.ok(!Number.isNaN(t), 'weddingDateTime must be a valid ISO timestamp')
  assert.ok(t > Date.now(), 'sample date must be in the future (customizable)')
})

test('event times are HH:MM and agree with weddingDateTime', () => {
  const event = INVITE_CONFIG.events[0]
  const time = /^[0-2][0-9]:[0-5][0-9]$/
  assert.match(event.calDate, /^\d{4}-\d{2}-\d{2}$/)
  assert.match(event.calStart, time)
  assert.match(event.calEnd, time)
  assert.ok(INVITE_CONFIG.weddingDateTime.startsWith(`${event.calDate}T${event.calStart}:`))
})

test('timezone is a valid IANA zone the platform can format', () => {
  const tz = INVITE_CONFIG.events[0].calTz
  assert.ok(tz.includes('/'))
  new Intl.DateTimeFormat('en', { timeZone: tz }) // throws if invalid
})

test('en and bn dictionaries expose the exact same translation keys', () => {
  const dict = dictionaries()
  const en = Object.keys(dict.en).sort()
  const bn = Object.keys(dict.bn).sort()
  assert.deepEqual(en, bn)
  assert.ok(en.length > 10, 'expected a meaningful set of strings')
})

test('every data-i18n key in index.html resolves in every locale', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const keys = [...html.matchAll(/data-i18n(?:-aria|-alt|-placeholder|-title)?="([^"]+)"/g)].map(
    (match) => match[1],
  )
  assert.ok(keys.length > 70, `expected the page's i18n keys, found ${keys.length}`)
  const dict = dictionaries()
  for (const locale of LOCALES) {
    const missing = keys.filter((key) => !dict[locale]?.[key]?.trim())
    assert.deepEqual(missing, [], `${locale} is missing: ${missing.join(', ')}`)
  }
})

test('every locale code is supported and the default is one of them', () => {
  assert.deepEqual(LOCALES, ['en', ...Object.keys(INVITE_TRANSLATIONS)])
  assert.ok(LOCALES.includes(INVITE_CONFIG.localization.default))
  for (const l of LOCALES) assert.ok(l === 'en' || INVITE_TRANSLATIONS[l], `missing translations for ${l}`)
})

test('venue name/address are translated in every locale, map query is set', () => {
  const dict = dictionaries()
  for (const locale of LOCALES) {
    assert.ok(dict[locale]['details.venueName'].trim(), `venue name missing for ${locale}`)
    assert.ok(dict[locale]['details.venueAddress'].trim(), `venue address missing for ${locale}`)
  }
  assert.ok(INVITE_CONFIG.venue.mapQuery.trim(), 'map query must be set — the Maps URLs derive from it')
})

test('countdown unit labels exist and are localized in every locale', () => {
  const dict = dictionaries()
  for (const locale of LOCALES) {
    for (const key of ['countdown.days', 'countdown.hours', 'countdown.minutes', 'countdown.seconds', 'countdown.aria']) {
      assert.ok(dict[locale][key]?.trim(), `missing ${key} for ${locale}`)
    }
  }
})

test('a partial bn tree still composes the injected names', () => {
  const partial = bnFromConfig({ couple: { name1: 'রফি', name2: 'তাহমিনা' } })
  assert.equal(partial['cover.name1'], 'রফি')
  assert.equal(partial['hero.name2'], 'তাহমিনা')
  assert.equal(partial['cover.and'], '&')
  assert.equal(partial['rsvp.deadline'], '')
})

test('both family lines are filled in', () => {
  assert.ok(INVITE_CONFIG.welcome.parents1.trim())
  assert.ok(INVITE_CONFIG.welcome.parents2.trim())
})

test('audio is wired: enabled, pointing at the shipped track, provenance retained', () => {
  assert.equal(INVITE_CONFIG.music.enabled, true)
  assert.match(INVITE_CONFIG.music.src, /^assets\/audio\/.*\.mp3$/)
  assert.ok(INVITE_CONFIG.extras.musicProvenance, 'provenance record must be referenced')
})
