import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatEventDate, formatEventTime, countdownParts, localizeNumber } from '../js/lib/datetime.js'

const ISO = '2026-12-11T16:00:00+06:00' // sample: Friday 11 Dec 2026, 4:00 PM Dhaka
const TZ = 'Asia/Dhaka'

test('formatEventDate renders localized long date in English', () => {
  assert.equal(formatEventDate(ISO, TZ, 'en'), 'Friday, December 11, 2026')
})

test('formatEventDate renders Bengali date with Bengali weekday and digits', () => {
  const out = formatEventDate(ISO, TZ, 'bn')
  assert.ok(out.includes('শুক্রবার'), `expected Bengali for Friday, got: ${out}`)
  assert.ok(out.includes('২০২৬'), `expected Bengali digits for year, got: ${out}`)
})

test('formatEventTime renders 12-hour time in English', () => {
  assert.equal(formatEventTime(ISO, TZ, 'en'), '4:00 PM')
})

test('formatEventTime renders Bengali digits in Bengali locale', () => {
  const out = formatEventTime(ISO, TZ, 'bn')
  assert.ok(out.includes('৪:০০'), `expected Bengali digit time, got: ${out}`)
})

test('formatEventDate respects the timezone, not the host clock', () => {
  // 2026-12-11T02:00:00-05:00 is 13:00 in Dhaka — must stay on Dec 11 there
  assert.equal(formatEventDate('2026-12-11T02:00:00-05:00', TZ, 'en'), 'Friday, December 11, 2026')
})

test('countdownParts splits remaining time correctly', () => {
  const now = Date.parse('2026-12-10T10:00:00Z') // exactly 24h before target (10:00Z)
  assert.deepEqual(countdownParts(ISO, now), { days: 1, hours: 0, minutes: 0, seconds: 0, past: false })
})

test('countdownParts handles partial remainder', () => {
  const now = Date.parse('2026-12-10T11:30:45Z')
  const p = countdownParts(ISO, now)
  assert.equal(p.days, 0)
  assert.equal(p.hours, 22)
  assert.equal(p.minutes, 29)
  assert.equal(p.seconds, 15)
  assert.equal(p.past, false)
})

test('countdownParts reports past events as zeroed + past', () => {
  const now = Date.parse('2027-01-01T00:00:00Z')
  assert.deepEqual(countdownParts(ISO, now), { days: 0, hours: 0, minutes: 0, seconds: 0, past: true })
})

test('localizeNumber renders plain digits in English', () => {
  assert.equal(localizeNumber(42, 'en'), '42')
  assert.equal(localizeNumber(0, 'en'), '0')
})

test('localizeNumber renders Bengali digits in Bengali locale', () => {
  assert.equal(localizeNumber(42, 'bn'), '৪২')
  assert.equal(localizeNumber(0, 'bn'), '০')
})

test('localizeNumber never groups digits and clamps negatives to zero', () => {
  assert.equal(localizeNumber(12345, 'en'), '12345')
  assert.equal(localizeNumber(-3, 'en'), '0')
  assert.equal(localizeNumber(-3, 'bn'), '০')
})
