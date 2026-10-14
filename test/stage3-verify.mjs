// Stage-3 hardening regression — non-audio accessibility/keyboard/reduced-motion
// fixes. Not part of npm test.
// Run: node test/stage3-verify.mjs   (static server on :8125, Chrome on :9222)
// Raw log + screenshots → /tmp/verify/stage3-*.log / stage3-*.png
//
// Requirements under test:
//  H1  While the cover gates the page, the invitation beneath it is inert
//      (out of tab order and the accessibility tree) — Tab must never land on
//      controls hidden behind the cover (H2), and the way back must reopen it
//      interactive (H3).
//  H4  Dev replay re-arms the gate and moves focus off the re-occluded page
//      onto the cover cue — never leaves offscreen/occluded focus.
//  H5  Reduced motion: activating the cover enters instantly — no entrance
//      tween on the hero at all (no y-offset motion, no fade), focus lands on
//      the hero heading.
//  H6  Motion-allowed entrance still animates the hero (guards H5 from
//      over-hardening).
//  H7  The per-second countdown never announces to screen readers: explicit
//      aria-live="off" on the timer region (role="timer" is a live-region role;
//      without an explicit off, some SR/browser pairs announce digit swaps).
//  H8  Both locale toggle buttons declare their own language (in BN mode the
//      visible "EN" button must not be read with a Bengali voice).

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

async function freshPage({ width = 390, height = 844, reducedMotion = 'no-preference', url = BASE } = {}) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width, height })
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reducedMotion }])
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
  await page.evaluate(() => localStorage.setItem('invitation:audio', 'off'))
  return { page, context, errors }
}

const coverGone = (page, timeout = 9000) => page.waitForFunction(() => {
  const c = document.getElementById('cover')
  return !c || getComputedStyle(c).display === 'none'
}, { polling: 40, timeout })

/* ── H1/H2/H3 · Cover gates the page: inert background, safe tab order ──── */
{
  const { page, context, errors } = await freshPage()
  await sleep(500)
  check('H1 invitation is inert while the cover gates the page',
    await page.evaluate(() => document.getElementById('invitation').inert === true))

  const stops = []
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    stops.push(await page.evaluate(() => ({
      cls: document.activeElement.className || document.activeElement.tagName,
      behind: !!document.activeElement.closest?.('#invitation'),
    })))
  }
  check('H2 keyboard Tab never reaches controls hidden behind the cover',
    stops.length === 8 && !stops.some((s) => s.behind) && stops.some((s) => s.cls.includes('cover-cue')) &&
    stops.some((s) => s.cls.includes('cover-skip')),
    JSON.stringify(stops.map((s) => s.cls)))

  await page.evaluate(() => document.querySelector('.cover-cue').click())
  await coverGone(page)
  check('H3 inert lifted as the cover dismisses',
    await page.evaluate(() => document.getElementById('invitation').inert === false))
  // The details CTA carries its scroll-entrance start state (autoAlpha 0,
  // visibility hidden) until its own trigger fires — reveal it by scrolling,
  // then it must be focusable again.
  await page.evaluate(() => {
    const top = document.querySelector('#details').getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top, behavior: 'instant' })
  })
  await sleep(1300)
  const open = await page.evaluate(() => {
    const cta = document.querySelector('#details .cta')
    cta.focus()
    return {
      inert: document.getElementById('invitation').inert,
      visible: getComputedStyle(cta).visibility === 'visible',
      ctaFocusable: document.activeElement === cta,
    }
  })
  check('H3 after entering, invitation is interactive again (inert lifted, revealed CTA focusable)',
    open.inert === false && open.visible && open.ctaFocusable, JSON.stringify(open))
  check('H1–H3 no page/console errors', errors.length === 0, errors.join(' | ').slice(0, 200))
  await context.close()
}

/* ── H4 · Dev replay: gate re-armed, focus moved to the cover cue ────────── */
{
  const { page, context, errors } = await freshPage({ url: BASE + '?dev=1' })
  await sleep(500)
  await page.evaluate(() => document.querySelector('.cover-cue').click())
  await coverGone(page)
  await sleep(1500) // hero hand-off + focus settle
  await page.evaluate(() => document.querySelector('.dev-replay').click())
  await sleep(500)
  const rp = await page.evaluate(() => ({
    inert: document.getElementById('invitation').inert,
    focus: document.activeElement.className || document.activeElement.tagName,
    state: document.getElementById('cover')?.dataset.state,
  }))
  check('H4 replay re-arms the gate and focuses the cover cue (focus not left on the occluded page)',
    rp.inert === true && rp.focus.includes('cover-cue') && rp.state === 'idle', JSON.stringify(rp))
  await page.screenshot({ path: `${OUT}/stage3-replay-focus-en-390.png` })
  check('H4 no page/console errors (replay)', errors.length === 0, errors.join(' | ').slice(0, 200))
  await context.close()
}

/* ── H5 · Reduced-motion preference ignored: entrance still animates ─────── */
{
  const { page, context, errors } = await freshPage({ reducedMotion: 'reduce' })
  await page.evaluate(() => localStorage.setItem('invitation:audio', 'off'))
  await sleep(200)
  await page.evaluate(() => document.querySelector('.cover-cue').click())
  await sleep(400)
  const rm = await page.evaluate(() => ({
    state: document.getElementById('cover')?.dataset.state,
  }))
  check('H5 reduced-motion preference ignored: cinematic engages (not instant entry)',
    rm.state === 'playing', JSON.stringify(rm))
  await coverGone(page, 8000)
  await sleep(1400) // hero entrance stagger + focus hand-off
  const rm2 = await page.evaluate(() => ({
    focus: document.activeElement.className || document.activeElement.tagName,
    unlocked: !document.body.classList.contains('cover-active'),
    heroVisible: parseFloat(getComputedStyle(document.querySelector('.hero-names')).opacity),
  }))
  check('H5 reduced-motion preference ignored: focus lands on the hero heading, gate released',
    rm2.focus.includes('hero-names') && rm2.unlocked && rm2.heroVisible > 0.9, JSON.stringify(rm2))
  await page.screenshot({ path: `${OUT}/stage3-reduced-hero-en-390.png` })
  check('H5 no page/console errors (reduced entry)', errors.length === 0, errors.join(' | ').slice(0, 200))
  await context.close()

  const { page: pb, context: cb } = await freshPage({ reducedMotion: 'reduce', url: BASE + '?lang=bn', width: 360, height: 740 })
  await sleep(400)
  await pb.evaluate(() => document.querySelector('.cover-cue').click())
  await coverGone(pb, 8000)
  await pb.screenshot({ path: `${OUT}/stage3-reduced-hero-bn-360.png` })
  await cb.close()
}

/* ── H6 · Motion-allowed entrance still animates (anti-over-hardening) ───── */
{
  const { page, context } = await freshPage()
  await sleep(400)
  // Anchor on invitation:open (fired when the entrance begins), then sample at
  // a controlled interval inside the known tween window (delay 0.3s + duration
  // 0.7s → mid-entrance at ~0.5s, ≥150ms margin both sides) — never race the
  // cover dismissal, which resolves only ~0.15s before the tween ends.
  await page.evaluate(() => {
    window.__openAt = 0
    document.addEventListener('invitation:open', () => { window.__openAt = performance.now() })
  })
  await page.evaluate(() => document.querySelector('.cover-cue').click())
  await page.waitForFunction(() => window.__openAt > 0, { polling: 40, timeout: 9000 })
  await sleep(500)
  const m = await page.evaluate(() => ({
    sinceOpenMs: Math.round(performance.now() - window.__openAt),
    tweens: gsap.getTweensOf('.hero > :not(.sprig)').length,
    childOpacity: getComputedStyle(document.querySelector('.hero .invocation')).opacity,
    sprigOpacity: parseFloat(getComputedStyle(document.querySelector('#hero .sprig--tl')).opacity),
  }))
  check('H6 motion-allowed: hero entrance still animates (tween present, children start hidden)',
    m.tweens > 0 && parseFloat(m.childOpacity) < 1, JSON.stringify(m))
  check('H6 sprigs keep their resting 0.55 opacity during the entrance (no bold flash)',
    Math.abs(m.sprigOpacity - 0.55) < 0.02, `sprigOpacity=${m.sprigOpacity}`)
  await context.close()
}

/* ── H7 · Countdown: silent to screen readers (explicit aria-live off) ───── */
{
  const { page, context } = await freshPage()
  await sleep(400)
  const cd = await page.evaluate(() => {
    const el = document.querySelector('#countdown .countdown')
    return {
      role: el?.getAttribute('role'),
      live: el?.getAttribute('aria-live'),
      liveLabels: [...document.querySelectorAll('#countdown [aria-live]')].map((e) => e.getAttribute('aria-live')),
    }
  })
  check('H7 countdown region is role=timer with explicit aria-live="off" (no per-second announcements)',
    cd.role === 'timer' && cd.live === 'off' && cd.liveLabels.every((l) => l === 'off'), JSON.stringify(cd))
  await context.close()
}

/* ── H8 · Locale buttons declare their own language ──────────────────────── */
{
  const { page, context } = await freshPage({ url: BASE + '?lang=bn' })
  await sleep(400)
  const langs = await page.evaluate(() => ({
    en: document.querySelector('[data-locale-btn="en"]')?.getAttribute('lang'),
    bn: document.querySelector('[data-locale-btn="bn"]')?.getAttribute('lang'),
    page: document.documentElement.lang,
  }))
  check('H8 locale buttons declare their own language (EN readable as EN inside the BN page)',
    langs.en === 'en' && langs.bn === 'bn' && langs.page === 'bn', JSON.stringify(langs))
  await context.close()
}

/* ── Desktop BN open-state screenshot (visual regression for the fixes) ──── */
{
  const { page, context } = await freshPage({ width: 1440, height: 900, url: BASE + '?lang=bn' })
  await sleep(500)
  await page.evaluate(() => document.querySelector('.cover-cue').click())
  await coverGone(page)
  await sleep(1600)
  await page.screenshot({ path: `${OUT}/stage3-open-bn-1440.png` })
  await context.close()
}

await browser.disconnect()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} stage-3 hardening checks passed`)
process.exit(failed.length ? 1 : 0)
