import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { config } from '../js/config.js'
import { initRsvp } from '../js/rsvp.js'

function setup({ fetchImpl = async () => ({ ok: true, json: async () => ({}) }) } = {}) {
  const listeners = {}
  const opened = []
  const error = { hidden: true }
  const confirmation = { hidden: true, textContent: '' }
  const name = { value: 'Nusrat Ahmed', focus() {} }
  const guests = { value: '2', selectedIndex: 1, options: [{ text: '1 guest' }, { text: '2 guests' }] }
  const note = { value: 'Vegetarian meal' }
  const form = {
    elements: { name, attend: { value: 'accept' }, guests, note },
    querySelector: (selector) => ({ '[data-rsvp-error]': error })[selector],
    addEventListener: (name, fn) => { listeners[name] = fn },
  }
  globalThis.document = {
    documentElement: { lang: 'en' },
    getElementById: (id) => ({ 'rsvp-form': form, 'rsvp-done': confirmation })[id] || null,
  }
  globalThis.window = { open: (...args) => opened.push(args) }
  globalThis.location = { href: '' }
  globalThis.fetch = fetchImpl
  initRsvp()
  return {
    opened,
    form,
    confirmation,
    submit: async () => listeners.submit({ preventDefault() {} }),
  }
}

test('RSVP posts guest answers to the configured endpoint', async () => {
  const previousEndpoint = config.rsvp.endpoint
  let request
  config.rsvp.endpoint = 'https://example.test/rsvp'
  try {
    const page = setup({ fetchImpl: async (url, options) => {
      request = { url, options }
      return { ok: true, json: async () => ({}) }
    } })
    await page.submit()

    assert.equal(request.url, 'https://example.test/rsvp')
    assert.equal(request.options.method, 'POST')
    assert.deepEqual(JSON.parse(request.options.body), {
      couple: 'Wedding of Ayesha & Imran',
      name: 'Nusrat Ahmed', attending: 'accept', guests: '2', note: 'Vegetarian meal',
    })
    assert.deepEqual(page.opened, [])
    assert.equal(page.form.hidden, true)
    assert.equal(page.confirmation.hidden, false)
    assert.equal(page.confirmation.textContent, 'Thank you — your RSVP has been received.')
  } finally {
    config.rsvp.endpoint = previousEndpoint
  }
})

test('RSVP falls back to WhatsApp when endpoint delivery fails', async () => {
  const previousEndpoint = config.rsvp.endpoint
  config.rsvp.endpoint = 'https://example.test/rsvp'
  try {
    const page = setup({ fetchImpl: async () => { throw new Error('network unavailable') } })
    await page.submit()

    assert.equal(page.opened.length, 1)
    assert.match(page.opened[0][0], /^https:\/\/wa\.me\/8801000000000\?text=/)
    const body = new URL(page.opened[0][0]).searchParams.get('text')
    assert.match(body, /Nusrat Ahmed/)
    assert.match(body, /Vegetarian meal/)
    assert.equal(page.form.hidden, true)
    assert.equal(page.confirmation.hidden, false)
    assert.equal(page.confirmation.textContent, 'WhatsApp opened with your reply — press Send to deliver it.')
  } finally {
    config.rsvp.endpoint = previousEndpoint
  }
})

test('RSVP form no longer offers a nonfunctional email link', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  assert.doesNotMatch(html, /data-rsvp-email|reply by email/i)
})
