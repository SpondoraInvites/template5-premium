import { test } from 'node:test'
import assert from 'node:assert/strict'

let loads = 0

// Each load gets a fresh module instance so the hook runs against the globals
// set by the test above it.
async function loadConfig() {
  loads += 1
  const url = new URL('../config.js', import.meta.url)
  url.search = `?hook-test=${loads}`
  return import(url.href)
}

test('publish globals replace both trees instead of merging', async () => {
  globalThis.window = {
    __INVITE_CONFIG__: { couple: { name1: 'রফি', name2: 'তাহমিনা' } },
    __INVITE_TRANSLATIONS__: { bn: { couple: { name1: 'রফি', name2: 'তাহমিনা' } } },
  }
  const { INVITE_CONFIG, INVITE_TRANSLATIONS } = await loadConfig()
  assert.deepEqual(INVITE_CONFIG, { couple: { name1: 'রফি', name2: 'তাহমিনা' } })
  assert.deepEqual(INVITE_TRANSLATIONS, { bn: { couple: { name1: 'রফি', name2: 'তাহমিনা' } } })
  delete globalThis.window
})

test('#cfg preview payload survives a </script> string', async () => {
  const text = 'শেষ </script> এখানে'
  const payload = {
    config: { couple: { name1: 'রফি' } },
    translations: { bn: { closing: text } },
  }
  globalThis.window = {}
  globalThis.location = { hash: '#cfg=' + encodeURIComponent(JSON.stringify(payload)) }
  const mod = await loadConfig()
  assert.equal(mod.INVITE_CONFIG.couple.name1, 'রফি')
  assert.equal(mod.INVITE_TRANSLATIONS.bn.closing, text)
  delete globalThis.window
  delete globalThis.location
})

test('without a window the defaults are untouched (Node import)', async () => {
  const { INVITE_CONFIG, INVITE_TRANSLATIONS } = await loadConfig()
  assert.ok(INVITE_CONFIG.events.length > 0)
  assert.ok(INVITE_TRANSLATIONS.bn.couple.name1)
})
