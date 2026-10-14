// Stage-2 cleanup regression — injected MID-initialization failure inside the
// scroll choreography. The harness intercepts GSAP in the browser (no
// production test hooks): when scroll.js calls gsap.context the wrapper arms,
// and the first gsap.timeline call inside the choreography throws — i.e. after
// the hero section is fully built (prepDraw style mutations + tweens +
// ScrollTriggers) and partway into the message section. The page must fall
// back to the fully readable static page: text visible, SVG path styles
// restored, zero leftover ScrollTriggers/tweens, boot not derailed, countdown
// still live. Not part of npm test.
// Run: node test/stage2-cleanup-verify.mjs   (static server on :8125, Chrome on :9222)

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

// Intercept GSAP: wrap gsap.context to arm, gsap.timeline to throw once armed.
// gsap.min.js assigns `global.gsap = {}` and fills it afterwards inside the
// factory, so patch in a microtask once the object is populated.
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(window, 'gsap', {
    configurable: true,
    set(v) {
      Object.defineProperty(window, 'gsap', { configurable: true, writable: true, value: v })
      if (!v || typeof v !== 'object') return
      Promise.resolve().then(() => {
        const armed = { on: false }
        const origContext = v.context.bind(v)
        v.context = (...args) => { armed.on = true; return origContext(...args) }
        const origTimeline = v.timeline.bind(v)
        v.timeline = (...args) => {
          if (armed.on) { armed.on = false; throw new Error('injected mid-init failure') }
          return origTimeline(...args)
        }
      })
    },
  })
})

const warnings = []
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.text().includes('scroll choreography disabled')) warnings.push(m.text())
  if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) errors.push(m.text())
})

await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 })
await sleep(800) // let the failure + cleanup settle, countdown tick once

const st = await page.evaluate(() => {
  const cs = (el) => el ? getComputedStyle(el) : null
  const draws = [...document.querySelectorAll('#hero .sprig .draw, #message .divider--anim .draw')]
  const leaves = [...document.querySelectorAll('#hero .sprig .leaf')]
  const mask = document.querySelector('#message .mask-line')
  const quote = document.querySelector('#message blockquote')
  return {
    booted: window.__invitationBooted === true,
    coverKept: !!document.getElementById('cover'),
    jsClass: document.documentElement.classList.contains('js'),
    drawInline: draws.map((d) => `${d.style.strokeDasharray}|${d.style.strokeDashoffset}`),
    drawCount: draws.length,
    leafInline: leaves.map((l) => l.style.transform),
    leafCount: leaves.length,
    maskTransform: mask ? cs(mask).transform : 'missing',
    quoteOpacity: quote ? cs(quote).opacity : 'missing',
    triggers: window.ScrollTrigger ? window.ScrollTrigger.getAll().length : -1,
    tweensDraw: window.gsap ? window.gsap.getTweensOf('#hero .sprig .draw').length : -1,
    tweensLeaf: window.gsap ? window.gsap.getTweensOf('#hero .sprig .leaf').length : -1,
    tweensDiamond: window.gsap ? window.gsap.getTweensOf('#message .divider--anim .flourish-diamond').length : -1,
  }
})

check('boot completed and fail-safe NOT triggered (cover kept, js class on, boot flag true)',
  st.booted && st.coverKept && st.jsClass, JSON.stringify({ booted: st.booted, coverKept: st.coverKept, jsClass: st.jsClass }))

check('SVG path drawings fully restored (no leftover stroke-dasharray/dashoffset inline styles)',
  st.drawCount >= 8 && st.drawInline.every((s) => s === '|'),
  JSON.stringify(st.drawInline))

check('hero leaves restored (no leftover hidden transform from partial fromTo)',
  st.leafCount >= 2 && st.leafInline.every((t) => t === ''),
  JSON.stringify(st.leafInline))

check('section text visible (message mask not translated/hidden, quote fully opaque)',
  st.maskTransform !== 'missing' && (st.maskTransform === 'none' || st.maskTransform.includes('matrix(1, 0, 0, 1, 0, 0)')) && st.quoteOpacity === '1',
  `mask=${st.maskTransform} quote=${st.quoteOpacity}`)

check('no partial ScrollTriggers left alive', st.triggers === 0, `ScrollTrigger.getAll().length=${st.triggers}`)

check('no partial tweens left alive (draws, leaves, diamonds)',
  st.tweensDraw === 0 && st.tweensLeaf === 0 && st.tweensDiamond === 0,
  `draw=${st.tweensDraw} leaf=${st.tweensLeaf} diamond=${st.tweensDiamond}`)

check('countdown still live (content survives the failure, seconds tick)',
  await (async () => {
    const a = await page.evaluate(() => document.querySelector('.cd-num[data-cd="seconds"]')?.textContent)
    await sleep(1500)
    const b = await page.evaluate(() => document.querySelector('.cd-num[data-cd="seconds"]')?.textContent)
    return !!a && a !== b
  })(), 'seconds advanced after failure')

check('cleanup warning logged (choreography disabled, not silent)', warnings.length === 1, warnings.join(' | ').slice(0, 200))
check('no page/console errors beyond the injected failure', errors.length === 0, errors.join(' | ').slice(0, 300))

await page.screenshot({ path: `${OUT}/stage2-cleanup-${process.env.RUN_TAG || 'run'}.png` })
await browser.disconnect()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} stage-2 cleanup checks passed`)
process.exit(failed.length ? 1 : 0)
