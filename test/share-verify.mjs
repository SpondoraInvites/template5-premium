// Map embed + share menu verification (not part of npm test).
// Run: node test/share-verify.mjs   (static server on :8125, Chrome on :9222)

import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'

const require = createRequire('/home/ashik/.agents/skills/browser-tools/package.js')
const puppeteer = require('puppeteer-core')
const BASE = 'http://localhost:8125/index.html'
const OUT = '/tmp/verify'
mkdirSync(OUT, { recursive: true })

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok })
  console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ' — ' + detail : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null })
const context = await browser.createBrowserContext()
const page = await context.newPage()
await page.setViewport({ width: 390, height: 844 })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto(BASE, { waitUntil: 'networkidle0' })
await sleep(400)

// Skip the cover and scroll to the venue section.
await page.evaluate(() => document.querySelector('.cover-cue').click())
await sleep(600)
await page.evaluate(() => document.querySelector('.cover-skip').click())
await sleep(1200)
await page.evaluate(() => document.querySelector('#venue').scrollIntoView())
await sleep(900)

// M1 · map embed: src from config, framed, lazy, sized
const map = await page.evaluate(() => {
  const f = document.querySelector('[data-map-embed]')
  return {
    src: f?.src ?? '',
    title: f?.getAttribute('title') ?? '',
    lazy: f?.getAttribute('loading'),
    w: Math.round(f?.getBoundingClientRect().width ?? 0),
    h: Math.round(f?.getBoundingClientRect().height ?? 0),
  }
})
check('M1 map embed src comes from config (keyless output=embed)',
  map.src.startsWith('https://www.google.com/maps?q=Lakeshore+Hotel+Gulshan+Dhaka') && map.src.includes('output=embed'), map.src)
check('M2 map embed is titled, lazy and visibly sized (≥250px tall)',
  map.title === 'Map of the venue' && map.lazy === 'lazy' && map.h >= 250, JSON.stringify(map))

// S1 · share button toggles the menu
const before = await page.evaluate(() => document.querySelector('[data-share-menu]').classList.contains('open'))
await page.evaluate(() => document.querySelector('[data-share-button]').click())
await sleep(400)
const after = await page.evaluate(() => ({
  open: document.querySelector('[data-share-menu]').classList.contains('open'),
  visible: getComputedStyle(document.querySelector('[data-share-menu]')).visibility,
  expanded: document.querySelector('[data-share-button]').getAttribute('aria-expanded'),
  options: [...document.querySelectorAll('[data-share-menu] [data-share]')].map((b) => b.dataset.share),
}))
check('S1 share button opens the options menu with a fade (aria-expanded synced)',
  before === false && after.open === true && after.visible === 'visible' && after.expanded === 'true', JSON.stringify(after))
check('S2 menu offers copy, whatsapp, facebook, telegram, email',
  ['copy', 'whatsapp', 'facebook', 'telegram', 'email'].every((o) => after.options.includes(o)), after.options.join(','))

// S3 · copy puts the page URL on the clipboard (grant permission first)
await context.overridePermissions('http://localhost:8125', ['clipboard-read', 'clipboard-write'])
await page.evaluate(() => document.querySelector('[data-share="copy"]').click())
await sleep(300)
const copied = await page.evaluate(() => document.querySelector('[data-share="copy"]').textContent)
const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''))
check('S3 copy link writes the page URL to the clipboard + localized feedback',
  clip === BASE && copied === 'Link copied!', `clip="${clip}" label="${copied}"`)

// S4 · whatsapp share composes wa.me with message + link (window.open stubbed)
await page.evaluate(() => {
  window.__share = null
  window.open = (url) => { window.__share = url; return null }
})
await page.evaluate(() => document.querySelector('[data-share="whatsapp"]').click())
await sleep(100)
const wa = await page.evaluate(() => decodeURIComponent(window.__share || ''))
check('S4 whatsapp share opens wa.me with event title + link',
  wa.startsWith('https://wa.me/?text=') && wa.includes('Wedding of Ayesha & Imran') && wa.includes(BASE), wa.slice(0, 90))

// S5 · facebook sharer carries the URL; menu closes after a channel action
await page.evaluate(() => document.querySelector('[data-share="facebook"]').click())
await sleep(100)
const fb = await page.evaluate(() => ({ url: decodeURIComponent(window.__share || ''), closed: !document.querySelector('[data-share-menu]').classList.contains('open') }))
check('S5 facebook sharer carries the URL and the menu closes after sharing',
  fb.url.startsWith('https://www.facebook.com/sharer/sharer.php?u=') && fb.url.includes(BASE) && fb.closed, fb.url.slice(0, 80))

// S6 · Escape closes the menu
await page.evaluate(() => document.querySelector('[data-share-button]').click())
await sleep(80)
await page.keyboard.press('Escape')
await sleep(80)
const esc = await page.evaluate(() => !document.querySelector('[data-share-menu]').classList.contains('open'))
check('S6 Escape closes the share menu', esc === true)

// S7 · BN locale relabels share options in place
await page.evaluate(() => document.querySelector('[data-locale-btn="bn"]').click())
await sleep(300)
const bn = await page.evaluate(() => ({
  button: document.querySelector('[data-share-button]').textContent,
  copy: document.querySelector('[data-share="copy"]').textContent,
}))
check('S7 share labels follow the locale (BN)',
  bn.button === 'আমন্ত্রণটি শেয়ার করুন' && bn.copy === 'লিংক কপি করুন', JSON.stringify(bn))

// S8–S10 · Floating share: appears past the hero, opens its own menu upward
await page.evaluate(() => window.scrollTo(0, 0))
await sleep(400)
const atTop = await page.evaluate(() => document.querySelector('.float-share').classList.contains('show'))
await page.evaluate(() => document.querySelector('#details').scrollIntoView())
await sleep(500)
const scrolled = await page.evaluate(() => ({
  show: document.querySelector('.float-share').classList.contains('show'),
  visible: getComputedStyle(document.querySelector('.float-share')).visibility,
}))
check('S8 floating share hidden in the hero, slides in after scrolling past it',
  atTop === false && scrolled.show === true && scrolled.visible === 'visible', JSON.stringify({ atTop, ...scrolled }))

await page.evaluate(() => document.querySelector('.float-share-button').click())
await sleep(400)
const floatOpen = await page.evaluate(() => ({
  floatMenu: document.getElementById('share-menu-float').classList.contains('open'),
  venueMenu: document.getElementById('share-menu').classList.contains('open'),
  options: [...document.querySelectorAll('#share-menu-float [data-share]')].map((b) => b.dataset.share),
}))
check('S9 floating button opens its own upward menu (venue menu stays closed)',
  floatOpen.floatMenu && !floatOpen.venueMenu && floatOpen.options.length === 5, JSON.stringify(floatOpen))

await page.evaluate(() => document.querySelector('#share-menu-float [data-share="copy"]').click())
await sleep(300)
const floatCopy = await page.evaluate(() => document.querySelector('#share-menu-float [data-share="copy"]').textContent)
check('S10 floating menu copy gives localized feedback', floatCopy === 'লিংক কপি হয়েছে!', floatCopy)

check('no page/console errors (map/share run)', errors.length === 0, errors.join(' | ').slice(0, 300))

await page.screenshot({ path: `${OUT}/share-venue-390.png` })
await context.close()
await browser.disconnect()
const pass = results.filter((r) => r.ok).length
console.log(`${pass}/${results.length} map/share checks passed`)
if (pass !== results.length) process.exit(1)
process.exit(0)
