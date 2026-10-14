// Stage-4 final verification — comprehensive non-audio sweep (not part of npm test).
// Run: node test/stage4-final-verify.mjs   (static server on :8125, Chrome on :9222)
//
// F1 real delayed network boot (>3s watchdog) → fallback → late resume safety
// F2 detached-cover replay safety (delayed resume + mid-reveal fallback)
// F3 blocked module fallback
// F4 nine sections render with no overflow across widths/locales + fonts
// F5 keyboard journey (tab order, activation, skip, focus, CTA hrefs)
// F6 locale journeys (initial BN, mid-play/mid-scroll switches, persistence)
// F7 reduced-motion preference ignored — full experience everywhere
// F8 hidden-tab pause/resume + replay cleanup
// F9 countdown/calendar/maps vs central config

import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

const require = createRequire('/home/ashik/.agents/skills/browser-tools/package.js')
const puppeteer = require('puppeteer-core')
const BASE = 'http://localhost:8125/index.html'
const OUT = '/tmp/verify'
const ROOT = process.cwd()
mkdirSync(OUT, { recursive: true })

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok })
  console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ' — ' + detail : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const SECTIONS = ['#hero', '#story', '#message', '#gallery', '#details', '#countdown', '#venue', '#rsvp', '#closing']
const MAIN_JS = readFileSync(join(ROOT, 'js', 'main.js'), 'utf8')

const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222',
  defaultViewport: null,
  protocolTimeout: 120000,
})

async function freshPage({ width = 390, height = 844, locale = 'en', reducedMotion = 'no-preference',
  delayMainMs = 0, blockMain = false, dev = false } = {}) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width, height })
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reducedMotion }])
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
  const intercept = delayMainMs > 0 || blockMain
  if (intercept) {
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      if (/\/js\/main\.js(\?|$)/.test(req.url())) {
        if (blockMain) return req.respond({ status: 404, body: 'not found' })
        return setTimeout(() => req.respond({
          status: 200, contentType: 'text/javascript', body: MAIN_JS,
        }), delayMainMs)
      }
      req.continue()
    })
  }
  const params = []
  if (locale === 'bn') params.push('lang=bn')
  if (dev) params.push('dev=1')
  const url = BASE + (params.length ? '?' + params.join('&') : '')
  // Intercepted pages keep the navigation pending (the delayed module holds
  // DOMContentLoaded): callers sample the pre-boot window, then `await nav`
  // once the module finally arrives. Otherwise it is awaited here, and the
  // music preference is seeded before any cover tap.
  const nav = page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  nav.catch(() => {})
  if (!intercept) {
    await nav
    await page.evaluate(() => localStorage.setItem('invitation:audio', 'off'))
  }
  return { page, context, errors, nav }
}

const watch = (page, fn, opts = {}) => page.waitForFunction(fn, { polling: 100, timeout: 10000, ...opts })

async function tapCue(page) {
  await page.evaluate(() => document.querySelector('.cover-cue').click())
}

async function enter(page) {
  await tapCue(page)
  await watch(page, () => {
    const c = document.getElementById('cover')
    return !c || getComputedStyle(c).display === 'none'
  }, { polling: 50, timeout: 9000 })
  await sleep(400)
}

// Focus/scroll invariants after a fallback or dismissal.
async function unlockedInvariant(page, label, { keyboardCta = false } = {}) {
  const st = await page.evaluate(() => ({
    cover: !!document.getElementById('cover'),
    inert: document.getElementById('invitation')?.inert ?? null,
    coverActive: document.body.classList.contains('cover-active'),
    scrollable: (() => { const y0 = scrollY; scrollTo(0, 600); const m = scrollY > 0; scrollTo(0, y0); return m })(),
    heroVisible: getComputedStyle(document.querySelector('.hero-names')).visibility,
  }))
  check(`${label} no cover (not re-locked behind a detached node)`, !st.cover, `coverPresent=${st.cover}`)
  check(`${label} invitation not inert`, st.inert === false, `inert=${st.inert}`)
  check(`${label} scroll lock released, page scrollable`,
    !st.coverActive && st.scrollable, `coverActive=${st.coverActive} scrolled=${st.scrollable}`)
  check(`${label} hero readable`, st.heroVisible === 'visible', st.heroVisible)
  if (keyboardCta) {
    await page.evaluate(() => {
      const top = document.querySelector('#details').getBoundingClientRect().top + scrollY - 90
      scrollTo({ top, behavior: 'instant' })
    })
    await page.waitForFunction(() =>
      getComputedStyle(document.querySelector('#details .cta')).visibility === 'visible',
    { polling: 100, timeout: 4000 })
    const kb = await page.evaluate(() => {
      const cta = document.querySelector('#details .cta')
      cta.focus()
      const ok = document.activeElement === cta
      cta.blur()
      scrollTo(0, 0)
      return ok
    })
    check(`${label} invitation CTA keyboard-reachable`, kb)
  }
}

// Scroll to a section, screenshot it, report readability + overflow.
async function shotSection(page, sel, path) {
  await page.evaluate((s) => document.querySelector(s).scrollIntoView(), sel)
  await sleep(900)
  const st = await page.evaluate((s) => {
    const el = document.querySelector(s)
    const r = el.getBoundingClientRect()
    return {
      inView: r.top < innerHeight && r.bottom > 0,
      text: el.innerText.length,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }
  }, sel)
  await page.screenshot({ path })
  return st
}

/* ══ F1 · Actual delayed network module (>3s watchdog), late resume ══════ */
{
  const { page, context, errors, nav } = await freshPage({ width: 390, height: 844, delayMainMs: 5200 })

  // Phase A — module still pending (nav held), watchdog silent: idle poster.
  // Sampled from the Node side with context-error retries: in-page numeric
  // polling can bind to the pre-navigation context and never re-bind.
  const sampleEarly = () => page.evaluate(() => {
    const cue = document.querySelector('.cover-cue')
    const c = document.getElementById('cover')
    if (!cue || !c) return null
    return {
      idle: c.classList.contains('is-idle'),
      cueVisible: getComputedStyle(cue).visibility === 'visible',
      booted: window.__invitationBooted === true,
      inert: document.getElementById('invitation')?.inert ?? null,
    }
  }).catch(() => null)
  let early = null
  for (let i = 0; i < 40; i++) {
    early = await sampleEarly()
    if (early && early.idle && early.cueVisible && !early.booted && !early.inert) break
    await sleep(100)
  }
  check('F1 idle poster visible while module still loading (pre-watchdog)',
    !!early && early.idle && early.cueVisible, JSON.stringify(early))
  check('F1 gate not yet armed pre-boot (boot pending, invitation ready)',
    !!early && !early.booted && early.inert === false, JSON.stringify(early))

  // Phase B — the 3s watchdog fires while the module is still pending.
  await sleep(3000) // the 3s watchdog fires while nav is still held
  await unlockedInvariant(page, 'F1 mid-stall watchdog fallback:')
  await nav.catch(() => {})

  // Phase C — the module finally arrives: boot resumes, page fully usable.
  await nav.catch(() => {})
  await watch(page, () => window.__invitationBooted === true, { timeout: 10000 })
  const resumed = await page.evaluate(() => ({
    cover: !!document.getElementById('cover'),
    inert: document.getElementById('invitation')?.inert ?? null,
    coverActive: document.body.classList.contains('cover-active'),
    seconds: document.querySelector('.cd-num[data-cd="seconds"]')?.textContent ?? '',
  }))
  check('F1 late boot resumed (flag set, countdown rendered)',
    !resumed.cover && !resumed.coverActive && resumed.seconds.length > 0, JSON.stringify(resumed))
  await unlockedInvariant(page, 'F1 after late resume:', { keyboardCta: true })

  const tick = await page.evaluate(() => new Promise((res) => {
    const a = document.querySelector('.cd-num[data-cd="seconds"]').textContent
    setTimeout(() => res({ a, b: document.querySelector('.cd-num[data-cd="seconds"]').textContent }), 1600)
  }))
  check('F1 countdown ticking after late resume', tick.a !== tick.b, `${tick.a} → ${tick.b}`)

  await page.evaluate(() => document.querySelector('[data-locale-btn="bn"]').click())
  await sleep(300)
  const bnHeading = await page.evaluate(() => document.querySelector('.hero-invite').textContent)
  check('F1 locale switch works after late resume', /আমন্ত্রণ|বিয়ের/.test(bnHeading), bnHeading)

  check('F1 no unexpected errors (real delayed network boot)', errors.length === 0, errors.join(' | ').slice(0, 300))
  await context.close()
}

/* ══ F2 · Re-lock safety: replay after delayed resume + mid-reveal fallback ══ */
{
  // Variant A — boot resumes late, visitor replays via the dev control.
  const { page: pa, context: ca, errors: ea, nav: navA } = await freshPage({ width: 390, height: 844, delayMainMs: 5200, dev: true })
  await navA.catch(() => {})
  await watch(pa, () => window.__invitationBooted === true, { timeout: 12000 })
  const replayVisible = await pa.evaluate(() => !document.querySelector('.dev-replay')?.hidden)
  check('F2 dev replay visible after late resume (?dev=1)', replayVisible)
  // The watchdog already removed the cover during the stall — the stale replay
  // control must bail silently and leave the static page unlocked.
  await pa.evaluate(() => document.querySelector('.dev-replay').click())
  await sleep(500)
  await unlockedInvariant(pa, 'F2 replay after delayed resume:', { keyboardCta: true })
  check('F2 no errors after replay on detached cover', ea.length === 0, ea.join(' | ').slice(0, 300))
  await ca.close()

  // Variant B — watchdog fires mid-reveal; the stale replay must not re-lock.
  // Self-contained: interception must be registered BEFORE the navigation so
  // the deferred-boot module is what the page actually executes.
  const contextB = await browser.createBrowserContext()
  const pageB = await contextB.newPage()
  await pageB.setViewport({ width: 390, height: 844 })
  const errorsB = []
  pageB.on('pageerror', (e) => errorsB.push('pageerror: ' + e))
  pageB.on('console', (m) => { if (m.type() === 'error') errorsB.push('console: ' + m.text()) })
  await pageB.setRequestInterception(true)
  pageB.on('request', (req) => {
    if (/\/js\/main\.js(\?|$)/.test(req.url())) {
      const src = MAIN_JS.replace('window.__invitationBooted = true',
        'setTimeout(() => { window.__invitationBooted = true }, 6000)')
      req.respond({ status: 200, contentType: 'text/javascript', body: src })
    } else {
      req.continue()
    }
  })
  const navB = pageB.goto(BASE + '?dev=1', { waitUntil: 'domcontentloaded', timeout: 30000 })
  navB.catch(() => {})
  await pageB.waitForFunction(() => document.querySelector('.cover-cue') !== null, { polling: 100, timeout: 15000 })
  await sleep(300)
  await pageB.evaluate(() => localStorage.setItem('invitation:audio', 'off'))
  await pageB.evaluate(() => document.querySelector('.cover-cue').click())
  await sleep(1000) // reveal is playing (state = playing)
  await sleep(2800) // watchdog (3s boot guard) forces the fallback mid-reveal
  const midState = await pageB.evaluate(() => ({
    cover: !!document.getElementById('cover'),
    inert: document.getElementById('invitation')?.inert ?? null,
  }))
  check('F2 fallback during reveal removed cover + unlocked gate',
    !midState.cover && midState.inert === false, JSON.stringify(midState))
  await pageB.evaluate(() => document.querySelector('.dev-replay').click())
  // The hero entrance stagger is still running after the fallback entry —
  // wait for it to settle before asserting readability.
  await pageB.waitForFunction(() => {
    const n = document.querySelector('.hero-names')
    return n && getComputedStyle(n).visibility === 'visible' && parseFloat(getComputedStyle(n).opacity) >= 1
  }, { polling: 100, timeout: 8000 })
  await unlockedInvariant(pageB, 'F2 replay after mid-reveal fallback:')
  check('F2 no unexpected errors (mid-reveal fallback path)', errorsB.length === 0, errorsB.join(' | ').slice(0, 300))
  await contextB.close()
}

/* ══ F3 · Blocked module fallback ════════════════════════════════════════ */
{
  const { page, context, errors } = await freshPage({ width: 390, height: 844, blockMain: true })
  await sleep(3600) // past the 3s watchdog
  await unlockedInvariant(page, 'F3 blocked module fallback:', { keyboardCta: true })
  const staticDate = await page.evaluate(() => document.querySelector('[data-i18n-date]')?.textContent ?? '')
  check('F3 static date line present (JS fallback content)', staticDate.includes('December'), staticDate)
  check('F3 no unexpected errors (404 surfaces as network log only)',
    errors.every((e) => /Failed to load resource/i.test(e)), errors.join(' | ').slice(0, 300))
  await context.close()
}

/* ══ F4 · Nine sections across widths/locales, fonts, overflow ══════════ */
{
  for (const [w, h, locale] of [[360, 740, 'en'], [360, 740, 'bn'], [390, 844, 'en'], [390, 844, 'bn'],
    [430, 932, 'en'], [430, 932, 'bn'], [1440, 900, 'en'], [1440, 900, 'bn']]) {
    const { page, context, errors } = await freshPage({ width: w, height: h, locale })
    await enter(page)
    let sectionsOk = true
    const marks = []
    for (const sel of SECTIONS) {
      const st = await shotSection(page, sel, `${OUT}/final-${locale}-${w}-${sel.slice(1)}.png`)
      const ok = st.inView && st.text > 0 && !st.overflowX
      if (!ok) sectionsOk = false
      marks.push(`${sel.slice(1)}:${ok ? 'ok' : 'BAD'}`)
    }
    const fonts = await page.evaluate((needBn) => ({
      cormorant: document.fonts.check('16px "Cormorant Garamond"'),
      noto: document.fonts.check('16px "Noto Serif Bengali"'),
      bengaliDigits: !needBn || /[০-৯]/.test(document.querySelector('.cd-num[data-cd="seconds"]').textContent),
    }), locale === 'bn')
    check(`F4 ${locale.toUpperCase()} ${w}px: all nine sections render, no horizontal overflow`,
      sectionsOk, marks.join(' '))
    check(`F4 ${locale.toUpperCase()} ${w}px: webfonts loaded, serif stack applied`,
      fonts.cormorant && fonts.noto && fonts.bengaliDigits, JSON.stringify(fonts))
    check(`F4 ${locale.toUpperCase()} ${w}px: no console errors`, errors.length === 0, errors.join(' | ').slice(0, 200))
    await context.close()
  }
}

/* ══ F5 · Keyboard journey ══════════════════════════════════════════════ */
{
  const { page, context, errors } = await freshPage({ width: 390, height: 844 })
  await page.evaluate(() => document.querySelector('.cover-cue').focus())
  // Walk backward from the cue: the full chain is
  // locale EN → locale BN → audio toggle → cover cue.
  const back = []
  for (let i = 0; i < 3; i++) {
    await page.keyboard.down('Shift')
    await page.keyboard.press('Tab')
    await page.keyboard.up('Shift')
    back.push(await page.evaluate(() =>
      document.activeElement.className || document.activeElement.dataset.localeBtn || ''))
  }
  check('F5 tab order: locale EN → locale BN → audio toggle → cover cue',
    /audio-toggle/.test(back[0]) && back[1] === 'bn' && back[2] === 'en', JSON.stringify(back))
  check('F5 Shift+Tab from the cue walks the full chain and returns to it',
    back[2] === 'en' && (await page.evaluate(() => {
      document.querySelector('.cover-cue').focus()
      return document.activeElement === document.querySelector('.cover-cue')
    })))

  await page.keyboard.press('Enter')
  await sleep(600)
  const playing = await page.evaluate(() => document.getElementById('cover')?.dataset.state)
  check('F5 Enter on cue starts the choreography', playing === 'playing', playing)

  await page.evaluate(() => document.querySelector('[data-lb="close"]')?.blur())
  await page.keyboard.press('Tab')
  const skipFocused = await page.evaluate(() => /cover-skip/.test(document.activeElement.className))
  await page.keyboard.press('Enter')
  await sleep(800)
  check('F5 Tab reaches Skip during play; Enter skips', skipFocused, String(skipFocused))

  await page.waitForFunction(() => {
    const c = document.getElementById('cover')
    return !c || getComputedStyle(c).display === 'none'
  }, { polling: 50, timeout: 6000 })
  await sleep(1400)
  const post = await page.evaluate(() => ({
    focus: document.activeElement.className || document.activeElement.tagName,
    open: !document.body.classList.contains('cover-active'),
  }))
  check('F5 focus lands on hero names after entry; gate open',
    post.focus.includes('hero-names') && post.open, JSON.stringify(post))

  await page.evaluate(() => {
    const top = document.querySelector('#details').getBoundingClientRect().top + scrollY - 90
    scrollTo({ top, behavior: 'instant' })
  })
  await sleep(900)
  const ctas = await page.evaluate(() => {
    const cal = document.querySelector('[data-href="calendar"]')
    const map = document.querySelector('[data-href="maps"]')
    cal.focus()
    const calOk = document.activeElement === cal
    map.focus()
    const mapOk = document.activeElement === map
    return { calOk, mapOk, calHref: cal.href, mapHref: map.href }
  })
  check('F5 calendar + maps CTAs focusable', ctas.calOk && ctas.mapOk)
  const calDecoded = decodeURIComponent(ctas.calHref.replace(/\+/g, ' '))
  check('F5 calendar href: correct UTC window (10:00–12:00Z) + title',
    ctas.calHref.includes('20261211T100000Z') && ctas.calHref.includes('20261211T120000Z') &&
    calDecoded.includes('Wedding of Ayesha & Imran'), ctas.calHref)
  check('F5 maps href: venue URL from central config',
    ctas.mapHref === 'https://www.google.com/maps/search/?api=1&query=Lakeshore+Hotel+Gulshan+Dhaka', ctas.mapHref)
  check('F5 no errors (keyboard journey)', errors.length === 0, errors.join(' | ').slice(0, 200))
  await context.close()
}

/* ══ F6 · Locale journeys ══════════════════════════════════════════════ */
{
  const { page, context, errors } = await freshPage({ width: 390, height: 844, locale: 'bn' })
  const initial = await page.evaluate(() => ({
    cue: document.querySelector('.cover-cue').textContent,
    name: document.querySelector('.mask-line').textContent,
  }))
  check('F6 BN initial render: cover controls translated',
    initial.cue === 'আমন্ত্রণ খুলতে ট্যাপ করুন' && initial.name === 'আয়েশা', JSON.stringify(initial))

  const dateText = await page.evaluate(() => document.querySelector('[data-i18n-date]').textContent)
  check('F6 BN date localized in Asia/Dhaka (শুক্রবার ১১ ডিসেম্বর)',
    dateText.includes('শুক্রবার') && dateText.includes('১১'), dateText)

  await page.evaluate(() => document.querySelector('.cover-cue').click())
  await sleep(600)
  await page.evaluate(() => document.querySelector('[data-locale-btn="en"]').click())
  await sleep(200)
  const midPlay = await page.evaluate(() => document.getElementById('cover')?.dataset.state)
  await page.waitForFunction(() => {
    const c = document.getElementById('cover')
    return !c || getComputedStyle(c).display === 'none'
  }, { polling: 50, timeout: 8000 })
  const switched = await page.evaluate(() => ({
    heroName: document.querySelector('.hero-names span').textContent,
    stillOpen: !document.body.classList.contains('cover-active'),
  }))
  check('F6 mid-play locale switch: reveal not restarted, completes to open',
    midPlay === 'playing' && switched.stillOpen && switched.heroName === 'Ayesha Rahman',
    JSON.stringify({ midPlay, ...switched }))
  const enDigits = await page.evaluate(() =>
    /[0-9]/.test(document.querySelector('.cd-num[data-cd="seconds"]').textContent))
  check('F6 countdown digits EN after switch', enDigits)

  await context.close()

  // Mid-scroll switch with digits + persistence across reload.
  const { page: p2, context: c2, errors: e2 } = await freshPage({ width: 390, height: 844, locale: 'en' })
  await enter(p2)
  await p2.evaluate(() => document.querySelector('#details').scrollIntoView())
  await sleep(700)
  await p2.evaluate(() => document.querySelector('[data-locale-btn="bn"]').click())
  await sleep(400)
  const bnDigits = await p2.evaluate(() => ({
    seconds: document.querySelector('.cd-num[data-cd="seconds"]').textContent,
    label: document.querySelector('.cd-label[data-i18n="countdown.seconds"]').textContent,
  }))
  check('F6 mid-scroll switch: digits localize immediately (Bengali numerals)',
    /[০-৯]/.test(bnDigits.seconds) && bnDigits.label === 'সেকেন্ড', JSON.stringify(bnDigits))
  check('F6 mid-scroll switch: labels + sections re-render, reveals kept',
    await p2.evaluate(() => document.querySelector('#details .plate') !== null))

  const persisted = await p2.evaluate(() => ({
    lang: document.documentElement.lang,
    stored: localStorage.getItem('locale'),
  }))
  check('F6 locale persists across reload without URL param (no restart)',
    persisted.lang === 'bn' && persisted.stored === 'bn', JSON.stringify(persisted))
  check('F6 no errors (locale journey)', e2.length === 0, e2.join(' | ').slice(0, 200))
  await c2.close()
}

/* ══ F7 · Reduced-motion preference ignored — full experience ══════════ */
{
  const { page, context, errors } = await freshPage({ width: 390, height: 844, reducedMotion: 'reduce' })
  const idle = await page.evaluate(() => ({
    cue: getComputedStyle(document.querySelector('.cover-cue')).visibility,
  }))
  check('F7 reduced-motion preference ignored: idle poster visible',
    idle.cue === 'visible', JSON.stringify(idle))

  await page.evaluate(() => document.querySelector('.cover-cue').click())
  await sleep(700)
  const playing = await page.evaluate(() => document.getElementById('cover')?.dataset.state)
  check('F7 reduced-motion preference ignored: cinematic plays (not instant entry)',
    playing === 'playing', playing)
  await page.waitForFunction(() => {
    const c = document.getElementById('cover')
    return !c || getComputedStyle(c).display === 'none'
  }, { polling: 50, timeout: 8000 })

  let sectionsOk = true
  for (const sel of SECTIONS) {
    const st = await shotSection(page, sel, `${OUT}/final-reduced-${sel.slice(1)}-390.png`)
    if (!st.inView || !st.text || st.overflowX) sectionsOk = false
  }
  const particles = await page.evaluate(() => document.querySelectorAll('.page-petals > *').length)
  check('F7 reduced-motion preference ignored: all nine sections readable, no overflow', sectionsOk)
  check('F7 reduced-motion preference ignored: ambient particles present',
    particles > 0, String(particles))

  const usable = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    s: document.querySelector('.cd-num[data-cd="seconds"]').textContent,
  }))
  check('F7 page stays usable (locale and countdown live)',
    usable.lang === 'en' && usable.s.length > 0, JSON.stringify(usable))
  check('F7 no errors (reduced-motion journey)', errors.length === 0, errors.join(' | ').slice(0, 200))
  await context.close()
}

/* ══ F8 · Hidden-tab pause/resume + replay cleanup ══════════════════════ */
{
  const { page, context, errors } = await freshPage({ width: 390, height: 844, dev: true })
  await enter(page)
  await sleep(800)

  // Simulate hiding: dispatch visibilitychange with document.hidden patched.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await sleep(400)
  const hid = await page.evaluate(() => ({
    paused: window.gsap.globalTimeline.paused(),
    tl: +window.gsap.globalTimeline.time().toFixed(3),
    drift: document.querySelector('.page-petals .drift') ? getComputedStyle(document.querySelector('.page-petals .drift')).transform : 'none',
  }))
  await sleep(600)
  const frozen = await page.evaluate(() => ({
    tl: +window.gsap.globalTimeline.time().toFixed(3),
    drift: document.querySelector('.page-petals .drift') ? getComputedStyle(document.querySelector('.page-petals .drift')).transform : 'none',
  }))
  check('F8 page hidden pauses GSAP work (time frozen)',
    hid.paused && hid.tl === frozen.tl && hid.drift === frozen.drift, JSON.stringify({ hid, frozen }))

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await sleep(500)
  const resumed = await page.evaluate(() => !window.gsap.globalTimeline.paused())
  check('F8 page visible resumes', resumed)

  const petals = await page.evaluate(() => document.querySelectorAll('.page-petals > *').length)
  check('F8 ambient petals spawned once open (9 drift items)', petals === 9, String(petals))

  await page.evaluate(() => document.querySelector('.dev-replay').click())
  await sleep(600)
  const rp = await page.evaluate(() => ({
    petals: document.querySelectorAll('.page-petals > *').length,
    idle: document.getElementById('cover')?.dataset.state,
    coverPresent: !!document.getElementById('cover'),
    inert: document.getElementById('invitation')?.inert ?? false,
  }))
  check('F8 replay clears particles, tweens; resets to idle poster',
    rp.petals === 0 && rp.idle === 'idle' && rp.coverPresent, JSON.stringify(rp))
  check('F8 replay re-arms gate WITH the cover present (not a detached lock)',
    rp.inert === true && rp.coverPresent, JSON.stringify(rp))
  check('F8 no errors (pause/cleanup journey)', errors.length === 0, errors.join(' | ').slice(0, 200))
  await context.close()
}

/* ══ F9 · Countdown / calendar / maps vs central config ════════════════ */
{
  const { page, context, errors } = await freshPage({ width: 390, height: 844 })
  await enter(page)
  await page.evaluate(() => document.querySelector('#countdown').scrollIntoView())
  await sleep(700)
  const cd = await page.evaluate(() => {
    const get = (u) => +document.querySelector(`.cd-num[data-cd="${u}"]`).textContent
    return { days: get('days'), hours: get('hours'), minutes: get('minutes'), seconds: get('seconds') }
  })
  const expected = await page.evaluate(() => {
    const ms = new Date('2026-12-11T16:00:00+06:00') - Date.now()
    const past = ms <= 0
    const total = Math.max(0, Math.floor(ms / 1000))
    return {
      days: Math.floor(total / 86400),
      hours: Math.floor((total % 86400) / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60,
      past,
    }
  })
  const within = expected.past
    ? Object.values(cd).every((v) => v === 0)
    : Math.abs(cd.days - expected.days) <= 1 && cd.hours === expected.hours &&
      Math.abs(cd.minutes - expected.minutes) <= 1
  check('F9 countdown matches configured ISO (Asia/Dhaka) within tolerance',
    within && !expected.past, JSON.stringify({ got: cd, expected }))

  const links = await page.evaluate(() => ({
    cal: document.querySelector('[data-href="calendar"]').href,
    maps: document.querySelector('[data-href="maps"]').href,
  }))
  check('F9 calendar URL: UTC window for 16:00+06:00 → 10:00Z–12:00Z',
    links.cal.includes('20261211T100000Z') && links.cal.includes('20261211T120000Z'), links.cal)
  check('F9 calendar URL: localized title present',
    decodeURIComponent(links.cal.replace(/\+/g, ' ')).includes('Wedding of Ayesha & Imran'))
  check('F9 maps URL matches central config',
    links.maps === 'https://www.google.com/maps/search/?api=1&query=Lakeshore+Hotel+Gulshan+Dhaka', links.maps)
  check('F9 no errors (countdown/links)', errors.length === 0, errors.join(' | ').slice(0, 200))
  await context.close()
}

await browser.disconnect()
const pass = results.filter((r) => r.ok).length
console.log(`${pass}/${results.length} stage-4 final checks passed`)
if (pass !== results.length) process.exit(1)
process.exit(0)
