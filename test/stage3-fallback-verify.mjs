// Stage-3 fallback regression — a failure AFTER the cover gate is armed must
// still leave the usable static page: cover gone, invitation NOT inert,
// scrolling available, invitation links keyboard-reachable. Two fallback
// paths, each with a failure injected after `initCover()` armed the gate
// (body.cover-active + #invitation[inert] already applied):
//   P1  main.js catch: throw from the locale-button wiring (post-arm) →
//       main.js failSafe removes the cover — it must also unlock the gate.
//   P2  index.html boot watchdog: boot stalls past the 3s guard (harness
//       defers __invitationBooted via request interception) → the inline
//       watchdog removes the cover — it must also unlock the gate.
// Harness-only injection (evaluateOnNewDocument / request interception), no
// production test hooks. Not part of npm test.
// Run: node test/stage3-fallback-verify.mjs  (static server :8125, Chrome :9222)
// Raw log + screenshots → /tmp/verify/stage3-fallback-*.log / *.png

import { createRequire } from 'node:module'
import { mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire('/home/ashik/.agents/skills/browser-tools/package.js')
const puppeteer = require('puppeteer-core')
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = 'http://localhost:8125/index.html'
const OUT = '/tmp/verify'
mkdirSync(OUT, { recursive: true })
const TAG = process.env.RUN_TAG || 'run'

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok })
  console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ' — ' + detail : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null })

// Shared state assertions: the static page must be fully usable after any
// post-arm fallback. GSAP availability is irrelevant here — the invariant is
// that the page is NOT left in the pre-init blocked state (cover removed but
// gate still locked).
async function staticPageUsable(page, label) {
  const st = await page.evaluate(() => ({
    cover: !!document.getElementById('cover'),
    inert: document.getElementById('invitation')?.inert ?? null,
    coverActive: document.body.classList.contains('cover-active'),
    scrollHeight: document.documentElement.scrollHeight,
    scrollable: (() => {
      const y0 = window.scrollY
      window.scrollTo(0, 600)
      const moved = window.scrollY > 0
      window.scrollTo(0, y0)
      return moved
    })(),
  }))
  check(`${label} cover removed by the fallback path`, !st.cover, `coverPresent=${st.cover}`)
  check(`${label} invitation NOT inert (gate unlocked)`, st.inert === false, `inert=${st.inert}`)
  check(`${label} scroll lock released (no cover-active, page scrolls)`,
    !st.coverActive && st.scrollHeight > 1500 && st.scrollable,
    `coverActive=${st.coverActive} scrollHeight=${st.scrollHeight} scrolled=${st.scrollable}`)

  // Keyboard access: with inert lifted the invitation links must be reachable
  // (inert is exactly what removes them from the tab order and a11y tree).
  // The CTAs carry scroll-entrance start states from initScroll (which ran
  // before the injected failure) — reveal them, then focus.
  await page.evaluate(() => {
    const top = document.querySelector('#details').getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top, behavior: 'instant' })
  })
  await page.waitForFunction(() => {
    const cta = document.querySelector('#details .cta')
    return getComputedStyle(cta).visibility === 'visible'
  }, { polling: 100, timeout: 4000 })
  const kb = await page.evaluate(() => {
    const cta = document.querySelector('#details .cta')
    cta.focus()
    const focused = document.activeElement === cta
    cta.blur()
    return { focused, inert: document.getElementById('invitation').inert }
  })
  check(`${label} invitation link keyboard-reachable (CTA focusable, inert off)`,
    kb.focused && kb.inert === false, JSON.stringify(kb))
  await page.evaluate(() => window.scrollTo(0, 0))
  return st
}

/* ── P1 · main.js catch: failure after initCover() armed the gate ────────── */
{
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 390, height: 844 })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  // Throw only once the gate is armed (body.cover-active set by initCover) —
  // i18n.js queries the same selector pre-arm and must pass through.
  await page.evaluateOnNewDocument(() => {
    const orig = Document.prototype.querySelectorAll
    Document.prototype.querySelectorAll = function (sel, ...rest) {
      if (sel === '[data-locale-btn]' && document.body.classList.contains('cover-active')) {
        throw new Error('injected failure after gate armed')
      }
      return orig.call(this, sel, ...rest)
    }
  })
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 })
  await sleep(1000) // failSafe settles
  await staticPageUsable(page, 'P1 main.js catch:')
  check('P1 boot flag false (failSafe path taken, not a clean boot)',
    await page.evaluate(() => window.__invitationBooted === false))
  await page.screenshot({ path: `${OUT}/stage3-fallback-${TAG}-p1.png` })
  check('P1 no unexpected page/console errors (single injected failure surfaces as warning)',
    errors.every((e) => /injected failure after gate armed|fail-safe/.test(e)),
    errors.join(' | ').slice(0, 200))
  await context.close()
}

/* ── P2 · boot watchdog: boot armed the gate, then stalled past 3s ───────── */
{
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 390, height: 844 })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    if (/\/js\/main\.js(\?|$)/.test(req.url())) {
      // Harness-only: serve the real module with boot completion deferred past
      // the 3s watchdog — the gate arms, then the watchdog fires while armed.
      const src = readFileSync(join(ROOT, 'js', 'main.js'), 'utf8').replace(
        'window.__invitationBooted = true',
        'setTimeout(() => { window.__invitationBooted = true }, 6000)')
      req.respond({ status: 200, contentType: 'text/javascript', body: src })
    } else {
      req.continue()
    }
  })
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 })
  await sleep(4800) // watchdog (3s) fired, boot still deferred (6s)
  const armed = await page.evaluate(() => ({
    gateWasArmed: document.body.classList.contains('cover-active') === false &&
      window.__invitationBooted === false,
    cover: !!document.getElementById('cover'),
    inert: document.getElementById('invitation')?.inert ?? null,
  }))
  check('P2 watchdog fired while gate was armed (cover gone, boot still pending)',
    armed.gateWasArmed && !armed.cover, JSON.stringify(armed))
  await staticPageUsable(page, 'P2 boot watchdog:')
  await page.screenshot({ path: `${OUT}/stage3-fallback-${TAG}-p2.png` })
  await context.close()
}

await browser.disconnect()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} stage-3 fallback checks passed`)
process.exit(failed.length ? 1 : 0)
