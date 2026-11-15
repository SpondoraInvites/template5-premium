import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildGoogleCalendarUrl } from '../js/lib/calendar.js'

const event = {
  calDate: '2026-12-11',
  calStart: '16:00',
  calEnd: '18:00',
  calTz: 'Asia/Dhaka',
}

test('builds a Google Calendar template url with local times and the event zone', () => {
  const url = buildGoogleCalendarUrl({ event, title: 'Wedding of Ayesha & Imran', location: 'Lakeshore, Dhaka' })
  assert.ok(url.startsWith('https://calendar.google.com/calendar/render?'))
  const q = new URL(url).searchParams
  assert.equal(q.get('action'), 'TEMPLATE')
  assert.equal(q.get('dates'), '20261211T160000/20261211T180000')
  assert.equal(q.get('ctz'), 'Asia/Dhaka')
  assert.equal(q.get('text'), 'Wedding of Ayesha & Imran')
  assert.equal(q.get('location'), 'Lakeshore, Dhaka')
})

test('omits ctz when the event has no timezone', () => {
  const q = new URL(buildGoogleCalendarUrl({ event: { ...event, calTz: '' }, title: 'x', location: 'y' })).searchParams
  assert.equal(q.get('ctz'), null)
})

test('escapes special characters safely', () => {
  const url = buildGoogleCalendarUrl({ event, title: 'A & B+C', location: 'x?y=z' })
  const q = new URL(url).searchParams
  assert.equal(q.get('text'), 'A & B+C')
  assert.equal(q.get('location'), 'x?y=z')
})
