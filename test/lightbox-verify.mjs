// Gallery lightbox verification (not part of npm test).
// Run: node test/lightbox-verify.mjs   (static server on :8125, Chrome on :9222)

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

async function galleryReady(locale = 'en', hasTouch = false) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 390, height: 844, hasTouch })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(locale === 'bn' ? BASE + '?lang=bn' : BASE, { waitUntil: 'networkidle0' })
  await sleep(400)
  await page.evaluate(() => document.querySelector('.cover-cue').click())
  await sleep(600)
  await page.evaluate(() => document.querySelector('.cover-skip').click())
  await sleep(1000)
  await page.evaluate(() => document.querySelector('#gallery').scrollIntoView())
  await sleep(1200)
  return { page, context, errors }
}

const overlayState = (page) => page.evaluate(() => {
  const lb = document.querySelector('.lightbox')
  const img = lb.querySelector('img')
  return {
    open: lb.classList.contains('open'),
    src: (img.currentSrc || img.src).split('/').pop(),
    caption: lb.querySelector('figcaption').textContent,
    counter: lb.querySelector('.lightbox-counter').textContent,
    bodyLocked: document.body.classList.contains('lightbox-open'),
    inert: document.getElementById('invitation')?.inert ?? false,
  }
})

// L1 · click opens with the right image + caption; scroll locks; main is inert
{
  const { page, context, errors } = await galleryReady()
  const gridSrc = await page.evaluate(() => document.querySelectorAll('.gallery-item img')[1].src.split('/').pop())
  await page.evaluate(() => document.querySelectorAll('.gallery-item')[1].click())
  await sleep(500)
  const st = await overlayState(page)
  check('L1 click opens the lightbox with the clicked image + caption + counter',
    st.open && st.src === gridSrc && st.caption.length > 10 && /2\s*\/\s*6/.test(st.counter), JSON.stringify(st))
  check('L1 body scroll locked and invitation inert while open', st.bodyLocked && st.inert)
  check('L1 focus lands on the close button', await page.evaluate(() => document.activeElement.dataset.lb === 'close'))

  // L2 · next/prev with wrap-around (3/6 → prev ×3 wraps to 6/6)
  await page.evaluate(() => document.querySelector('[data-lb="next"]').click())
  await sleep(400)
  const third = await overlayState(page)
  check('L2 next advances the viewer', /3\s*\/\s*6/.test(third.counter) && third.src !== st.src)
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => document.querySelector('[data-lb="prev"]').click())
    await sleep(250)
  }
  await sleep(300)
  const wrapped = await overlayState(page)
  check('L2 prev wraps around to the last photo', /6\s*\/\s*6/.test(wrapped.counter), wrapped.counter)

  // L3 · arrow keys navigate; Escape closes and restores focus + scroll
  await page.keyboard.press('ArrowRight')
  await sleep(300)
  const afterArrow = await overlayState(page)
  check('L3 arrow key navigates (wrap to 1/6)', /1\s*\/\s*6/.test(afterArrow.counter))
  await page.keyboard.press('Escape')
  await sleep(500)
  const closed = await page.evaluate(() => ({
    open: document.querySelector('.lightbox').classList.contains('open'),
    locked: document.body.classList.contains('lightbox-open'),
    inert: document.getElementById('invitation')?.inert ?? false,
    focusBack: document.activeElement.closest('.gallery-item') !== null,
  }))
  check('L3 Escape closes, unlocks scroll, restores focus to the gallery',
    !closed.open && !closed.locked && !closed.inert && closed.focusBack, JSON.stringify(closed))

  // L4 · backdrop click closes
  await page.evaluate(() => document.querySelectorAll('.gallery-item')[0].click())
  await sleep(400)
  await page.mouse.click(20, 400) // far-left backdrop, outside the figure
  await sleep(500)
  check('L4 backdrop click closes the lightbox',
    await page.evaluate(() => !document.querySelector('.lightbox').classList.contains('open')))

  // L5 · tab is trapped inside the viewer while open
  await page.evaluate(() => document.querySelectorAll('.gallery-item')[2].click())
  await sleep(400)
  for (let i = 0; i < 5; i++) await page.keyboard.press('Tab')
  const trapped = await page.evaluate(() => document.querySelector('.lightbox').contains(document.activeElement))
  check('L5 focus stays inside the lightbox while tabbing', trapped)
  check('no page/console errors (lightbox run)', errors.length === 0, errors.join(' | ').slice(0, 300))
  await page.evaluate(() => document.querySelector('[data-lb="close"]').click())
  await sleep(400)
  await context.close()
}

// L6 · swipe navigation (touch)
{
  const { page, context, errors } = await galleryReady('en', true)
  await page.evaluate(() => document.querySelectorAll('.gallery-item')[0].click())
  await sleep(500)
  await page.touchscreen.touchStart(300, 400)
  await page.touchscreen.touchMove(120, 400)
  await page.touchscreen.touchEnd()
  await sleep(400)
  const swiped = await overlayState(page)
  check('L6 left swipe advances to the next photo', /2\s*\/\s*6/.test(swiped.counter), swiped.counter)
  check('no page/console errors (swipe run)', errors.length === 0, errors.join(' | ').slice(0, 300))
  await context.close()
}

// L7 · Bengali: localized captions, controls and numeral counter
{
  const { page, context, errors } = await galleryReady('bn')
  await page.evaluate(() => document.querySelectorAll('.gallery-item')[0].click())
  await sleep(500)
  const bn = await page.evaluate(() => ({
    caption: document.querySelector('.lightbox figcaption').textContent,
    close: document.querySelector('[data-lb="close"]').getAttribute('aria-label'),
    counter: document.querySelector('.lightbox-counter').textContent,
  }))
  check('L7 Bengali caption + localized close label + Bengali numeral counter',
    bn.caption.includes('গোলাপ') && bn.close === 'বন্ধ করুন' && bn.counter === '১ / ৬', JSON.stringify(bn))
  await page.screenshot({ path: `${OUT}/lightbox-bn-390.png` })
  check('no page/console errors (BN run)', errors.length === 0, errors.join(' | ').slice(0, 300))
  await context.close()
}

// L8 · desktop screenshot of the open viewer
{
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await sleep(400)
  await page.evaluate(() => document.querySelector('.cover-cue').click())
  await sleep(600)
  await page.evaluate(() => document.querySelector('.cover-skip').click())
  await sleep(1000)
  await page.evaluate(() => document.querySelector('#gallery').scrollIntoView())
  await sleep(1400)
  await page.evaluate(() => document.querySelectorAll('.gallery-item')[3].click())
  await sleep(600)
  await page.screenshot({ path: `${OUT}/lightbox-desktop-1440.png` })
  await context.close()
}

await browser.disconnect()
const pass = results.filter((r) => r.ok).length
console.log(`${pass}/${results.length} lightbox checks passed`)
if (pass !== results.length) process.exit(1)
process.exit(0)
