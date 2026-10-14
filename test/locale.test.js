import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveLocale, readStoredLocale, persistLocale } from '../js/lib/locale.js'

const SUPPORTED = ['en', 'bn']
const FALLBACK = 'en'

test('url param wins over stored preference', () => {
  assert.equal(resolveLocale({ urlParam: 'bn', stored: 'en', supported: SUPPORTED, fallback: FALLBACK }), 'bn')
})

test('stored preference wins over fallback', () => {
  assert.equal(resolveLocale({ urlParam: null, stored: 'bn', supported: SUPPORTED, fallback: FALLBACK }), 'bn')
})

test('falls back when nothing is set', () => {
  assert.equal(resolveLocale({ urlParam: null, stored: null, supported: SUPPORTED, fallback: FALLBACK }), 'en')
})

test('unsupported url param falls back to stored, then default', () => {
  assert.equal(resolveLocale({ urlParam: 'fr', stored: 'en', supported: SUPPORTED, fallback: FALLBACK }), 'en')
  assert.equal(resolveLocale({ urlParam: 'fr', stored: null, supported: SUPPORTED, fallback: FALLBACK }), 'en')
})

test('locale codes are case-insensitive', () => {
  assert.equal(resolveLocale({ urlParam: 'BN', stored: null, supported: SUPPORTED, fallback: FALLBACK }), 'bn')
  assert.equal(resolveLocale({ urlParam: null, stored: 'EN', supported: SUPPORTED, fallback: FALLBACK }), 'en')
})

test('readStoredLocale returns null when storage is empty or throws', () => {
  assert.equal(readStoredLocale({ getItem: () => null }), null)
  assert.equal(readStoredLocale({ getItem: () => { throw new Error('blocked') } }), null)
  assert.equal(readStoredLocale({ getItem: () => 'bn' }), 'bn')
})

test('persistLocale writes and survives storage that throws', () => {
  const mem = {}
  const storage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v } }
  persistLocale(storage, 'bn')
  assert.equal(storage.getItem('locale'), 'bn')
  // must not throw even if storage is unavailable (Safari private mode etc.)
  persistLocale({ setItem: () => { throw new Error('blocked') } }, 'bn')
})
