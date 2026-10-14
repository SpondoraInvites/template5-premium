import { test } from 'node:test'
import assert from 'node:assert/strict'
import { config } from '../js/config.js'

test('event timestamp parses and lies in the future', () => {
  const t = Date.parse(config.event.iso)
  assert.ok(!Number.isNaN(t), 'event.iso must be a valid ISO timestamp')
  assert.ok(t > Date.now(), 'sample date must be in the future (customizable)')
})

test('timezone is a valid IANA zone the platform can format', () => {
  assert.ok(config.event.timezone.includes('/'))
  new Intl.DateTimeFormat('en', { timeZone: config.event.timezone }) // throws if invalid
})

test('en and bn locales expose the exact same translation keys', () => {
  const en = Object.keys(config.i18n.en).sort()
  const bn = Object.keys(config.i18n.bn).sort()
  assert.deepEqual(en, bn)
  assert.ok(en.length > 10, 'expected a meaningful set of strings')
})

test('every locale code is supported and defaultLocale is one of them', () => {
  assert.ok(config.locales.includes(config.defaultLocale))
  for (const l of config.locales) assert.ok(config.i18n[l], `missing translations for ${l}`)
})

test('venue name/address are translated in every locale, maps url is https', () => {
  for (const locale of config.locales) {
    assert.ok(config.i18n[locale]['details.venueName'].trim(), `venue name missing for ${locale}`)
    assert.ok(config.i18n[locale]['details.venueAddress'].trim(), `venue address missing for ${locale}`)
  }
  assert.ok(config.venue.mapsUrl.startsWith('https://'))
})

test('countdown unit labels exist and are localized in every locale', () => {
  for (const locale of config.locales) {
    for (const key of ['countdown.days', 'countdown.hours', 'countdown.minutes', 'countdown.seconds', 'countdown.aria']) {
      assert.ok(config.i18n[locale][key]?.trim(), `missing ${key} for ${locale}`)
    }
  }
})

test('audio is wired: ready, pointing at the shipped track, provenance retained', () => {
  assert.equal(config.audio.ready, true)
  assert.match(config.audio.src, /^assets\/audio\/.*\.mp3$/)
  assert.ok(config.audio.provenance, 'provenance record must be referenced')
})
