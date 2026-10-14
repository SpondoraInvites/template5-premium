import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildGoogleCalendarUrl } from '../js/lib/calendar.js'

const event = {
  iso: '2026-12-11T16:00:00+06:00',      // 10:00 UTC
  endIso: '2026-12-11T18:00:00+06:00',   // 12:00 UTC
  timezone: 'Asia/Dhaka',
}

test('builds a Google Calendar template url with UTC dates', () => {
  const url = buildGoogleCalendarUrl({ event, title: 'Wedding of Ayesha & Imran', location: 'Lakeshore, Dhaka' })
  assert.ok(url.startsWith('https://calendar.google.com/calendar/render?'))
  const q = new URL(url).searchParams
  assert.equal(q.get('action'), 'TEMPLATE')
  assert.equal(q.get('dates'), '20261211T100000Z/20261211T120000Z')
  assert.equal(q.get('text'), 'Wedding of Ayesha & Imran')
  assert.equal(q.get('location'), 'Lakeshore, Dhaka')
})

test('escapes special characters safely', () => {
  const url = buildGoogleCalendarUrl({ event, title: 'A & B+C', location: 'x?y=z' })
  const q = new URL(url).searchParams
  assert.equal(q.get('text'), 'A & B+C')
  assert.equal(q.get('location'), 'x?y=z')
})
