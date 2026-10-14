// Stage-1 browser verification — requirement-based (not part of npm test).
// Run: node test/browser-verify.mjs   (static server on :8125, Chrome on :9222)
// Raw logs + screenshots → /tmp/verify/.
//
// Requirements under test (stage 1 correction):
//  R1  Initial cover (idle poster): monogram, family line, names, tap cue and
//      locale toggle all visible instantly; idle waits indefinitely (well past
//      the old 9s watchdog); no auto-play.
//  R2  Tap/keyboard starts the ≈3–5s choreography (awakening → botanical
//      drawing → panels part → ivory light → masked names) and enters the
//      invitation automatically at the end — no second tap. Timing measured
//      relative to the tap, not sampled at fixed offsets.
//  R3  Repeated taps during play are ignored; skip works mid-play and from
//      idle; animations play regardless of the OS reduced-motion preference;
//      dev replay fully resets
//      (including the faded monogram); dismissed cover leaves no stray
//      tweens/petals; page-hidden pauses work; locale switches never start or
//      restart the sequence; missing GSAP falls back to the static page.

import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'

const require = createRequire('/home/ashik/.agents/skills/browser-tools/package.js')
const puppeteer = require('puppeteer-core')
const BASE = 'http://localhost:8125/index.html'
const OUT = '/tmp/verify'
mkdirSync(OUT, { recursive: true })

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ' — ' + detail : ''}`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null })

async function freshPage({ width = 390, height = 844, js = true, reducedMotion = 'no-preference', url = BASE, blockGsap = false } = {}) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width, height })
  await page.setJavaScriptEnabled(js)
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reducedMotion }])
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  if (blockGsap) {
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      if (/gsap(\.min)?\.js$/.test(req.url())) req.abort()
      else req.continue()
    })
  }
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
  await page.evaluate(() => localStorage.setItem('invitation:audio', 'off'))
  return { page, context, errors }
}

// Snapshot of the idle-poster state used by several checks.
function readPoster() {
  return {
    state: document.getElementById('cover')?.dataset.state ?? null,
    coverUp: (() => { const c = document.getElementById('cover'); return c && getComputedStyle(c).display !== 'none' })(),
    initials: getComputedStyle(document.querySelector('.mono-initials')).opacity,
    family: getComputedStyle(document.querySelector('.cover-family')).opacity,
    cue: getComputedStyle(document.querySelector('.cover-cue')).opacity,
    nameLine: getComputedStyle(document.querySelector('.mask-line')).opacity,
    ringOffset: parseFloat(getComputedStyle(document.querySelector('.mono-art .draw')).strokeDashoffset),
    localeVisible: (() => { const l = document.querySelector('.locale-toggle'); return l && getComputedStyle(l).display !== 'none' })(),
    locked: document.body.classList.contains('cover-active'),
    petals: document.querySelectorAll('.petal').length,
  }
}
const posterOk = (p) => p.state === 'idle' && p.coverUp && p.initials > 0.9 && p.family > 0.9 &&
  p.cue > 0.9 && p.nameLine > 0.9 && p.ringOffset === 0 && p.localeVisible && p.locked && p.petals === 0

async function coverGone(page, timeout = 9000) {
  await page.waitForFunction(() => {
    const c = document.getElementById('cover')
    return !c || getComputedStyle(c).display === 'none'
  }, { polling: 40, timeout })
}
const tapCue = (page) => page.evaluate(() => document.querySelector('.cover-cue').click())

/* ── R1 · Idle poster: instantly visible, waits indefinitely ─────────────── */
{
  const { page, context, errors } = await freshPage()
  await sleep(500)
  const p = await page.evaluate(readPoster)
  check('R1 poster instantly visible (mono, family, names, cue, locale, ring drawn)',
    posterOk(p), JSON.stringify(p))
  await page.screenshot({ path: `${OUT}/idle-en-390.png` })

  const loadMark = await page.evaluate(() => performance.now())
  await sleep(Math.max(0, 10_000 - (await page.evaluate(() => performance.now()) - loadMark)))
  const p10 = await page.evaluate(readPoster)
  check('R1 idle waits indefinitely (>10s, past old 9s watchdog; no petals, no auto-play)',
    posterOk(p10), JSON.stringify(p10))
  check('no page/console errors (idle run)', errors.length === 0, errors.join(' | ').slice(0, 300))
  await context.close()

  // Poster visibility across widths and locales (screenshots for inspection).
  for (const [w, h] of [[360, 740], [430, 932], [1440, 900]]) {
    const { page: pw, context: cw } = await freshPage({ width: w, height: h })
    await sleep(600)
    const ok = posterOk(await pw.evaluate(readPoster))
    check(`R1 poster visible at ${w}px (EN)`, ok)
    await pw.screenshot({ path: `${OUT}/idle-en-${w}.png` })
    await cw.close()
  }
  for (const [w, h] of [[360, 740], [390, 844], [430, 932], [1440, 900]]) {
    const { page: pw, context: cw } = await freshPage({ width: w, height: h, url: BASE + '?lang=bn' })
    await sleep(600)
    const p2 = await pw.evaluate(readPoster)
    const bnName = await pw.evaluate(() => document.querySelector('.mask-line').textContent)
    const bnCue = await pw.evaluate(() => document.querySelector('.cover-cue').textContent)
    check(`R1 poster visible at ${w}px (BN)`, posterOk(p2) && bnName === 'আয়েশা' && bnCue.includes('ট্যাপ'),
      JSON.stringify({ state: p2.state, cue: p2.cue, name: p2.nameLine, bnName, bnCue }))
    await pw.screenshot({ path: `${OUT}/idle-bn-${w}.png` })
    await cw.close()
  }
}

/* ── R2 · Tap starts the choreography; measured tap-relative duration ────── */
{
  const { page, context, errors } = await freshPage()
  await sleep(500)

  // Keyboard first: focusing the cue and pressing Enter must start the sequence.
  await page.evaluate(() => document.querySelector('.cover-cue').focus())
  await page.keyboard.press('Enter')
  await sleep(200)
  const kb = await page.evaluate(() => document.getElementById('cover').dataset.state)
  check('R2 keyboard (Enter on cue) starts the sequence', kb === 'playing', `state=${kb}`)
  await context.close()

  const { page: p2, context: c2, errors: e2 } = await freshPage()
  await sleep(500)
  const t0 = await p2.evaluate(() => performance.now())
  await tapCue(p2)
  // Poll from the tap itself so the measured duration is truly tap-relative.
  const gonePromise = coverGone(p2)

  // Mid-sequence: names/flourish dissolved, cue gone, cover still up.
  await sleep(900)
  const mid = await p2.evaluate(() => ({
    state: document.getElementById('cover').dataset.state,
    coverUp: getComputedStyle(document.getElementById('cover')).display !== 'none',
    cue: getComputedStyle(document.querySelector('.cover-cue')).opacity,
    names: getComputedStyle(document.querySelector('.cover-names')).opacity,
  }))
  check('R2 at tap+0.9s sequence is mid-flight (playing, cue faded, names dissolved)',
    mid.state === 'playing' && mid.coverUp && mid.cue < 0.15 && mid.names < 0.15, JSON.stringify(mid))
  await p2.screenshot({ path: `${OUT}/seq-en-1.2s-390.png` })

  // Hidden page pauses gsap work (visibilitychange hook).
  await p2.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const paused = await p2.evaluate(() => window.gsap.globalTimeline.paused())
  await p2.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const resumed = await p2.evaluate(() => !window.gsap.globalTimeline.paused())
  check('R3 page-hidden pauses cover animation work, visible resumes', paused && resumed,
    `paused=${paused} resumed=${resumed}`)

  // Repeated taps must not restart or break the sequence.
  await sleep(300)
  await tapCue(p2); await sleep(250); await tapCue(p2); await sleep(250); await tapCue(p2)

  await sleep(600)
  await p2.screenshot({ path: `${OUT}/seq-en-2.6s-390.png` })
  await sleep(1000)
  await p2.screenshot({ path: `${OUT}/seq-en-3.6s-390.png` })

  await gonePromise
  const elapsed = await p2.evaluate(() => performance.now()) - t0
  check('R2 tap → invitation entered automatically in 3–5s (no second tap), repeated taps ignored',
    elapsed >= 3000 && elapsed <= 5000, `measured ${Math.round(elapsed)}ms`)

  await sleep(1600) // staggered hero reveal (and its focus hand-off) completes
  const after = await p2.evaluate(() => ({
    unlocked: !document.body.classList.contains('cover-active'),
    petals: document.querySelectorAll('.petal').length,
    hero: getComputedStyle(document.querySelector('.hero-names')).opacity,
    focus: document.activeElement?.className ?? '',
  }))
  check('R3 dismissed cover fully cleaned (scroll unlocked, petals killed, hero revealed+focused)',
    after.unlocked && after.petals === 0 && after.hero > 0.9 && after.focus.includes('hero-names'), JSON.stringify(after))
  await p2.screenshot({ path: `${OUT}/hero-en-390.png` })
  check('no page/console errors (sequence run)', e2.length === 0, e2.join(' | ').slice(0, 300))
  await c2.close()
}

/* ── R3 · Skip mid-play and skip from idle ───────────────────────────────── */
{
  const { page, context } = await freshPage()
  await sleep(500)
  let t0 = await page.evaluate(() => performance.now())
  await tapCue(page)
  await sleep(1000)
  await page.evaluate(() => document.querySelector('.cover-skip').click())
  await coverGone(page, 4000)
  let elapsed = await page.evaluate(() => performance.now()) - t0
  check('R3 skip mid-play enters quickly', elapsed < 1000 + 1800, `tap→in ${Math.round(elapsed)}ms`)
  await context.close()

  const { page: p2, context: c2 } = await freshPage()
  await sleep(500)
  t0 = await p2.evaluate(() => performance.now())
  await p2.evaluate(() => document.querySelector('.cover-skip').click())
  await coverGone(p2, 4000)
  elapsed = await p2.evaluate(() => performance.now()) - t0
  check('R3 skip from idle poster enters immediately', elapsed < 1800, `${Math.round(elapsed)}ms`)
  await c2.close()
}

/* ── R3 · Dev replay: full reset including the faded monogram ────────────── */
{
  const { page, context, errors } = await freshPage({ url: BASE + '?dev=1' })
  await sleep(500)
  await tapCue(page)
  await coverGone(page)
  const preReplay = await page.evaluate(() => getComputedStyle(document.querySelector('.cover-mono')).opacity)
  await page.evaluate(() => document.querySelector('.dev-replay').click())
  await sleep(800)
  const rp = await page.evaluate(() => ({
    state: document.getElementById('cover').dataset.state,
    coverUp: getComputedStyle(document.getElementById('cover')).display !== 'none',
    mono: getComputedStyle(document.querySelector('.cover-mono')).opacity,
    initials: getComputedStyle(document.querySelector('.mono-initials')).opacity,
    cue: getComputedStyle(document.querySelector('.cover-cue')).opacity,
    name: getComputedStyle(document.querySelector('.mask-line')).opacity,
  }))
  check('R3 replay returns to idle poster with monogram fully restored (not left faded)',
    rp.state === 'idle' && rp.coverUp && rp.mono === '1' && rp.initials > 0.9 && rp.cue > 0.9 && rp.name > 0.9,
    `pre-replay mono=${preReplay} ${JSON.stringify(rp)}`)
  await page.screenshot({ path: `${OUT}/replay-idle-390.png` })
  await sleep(1600)
  const stable = await page.evaluate(() => document.getElementById('cover').dataset.state)
  check('R3 replayed cover idles (no auto-play after replay)', stable === 'idle', `state=${stable}`)

  const t0 = await page.evaluate(() => performance.now())
  await tapCue(page)
  await coverGone(page)
  const elapsed = await page.evaluate(() => performance.now()) - t0
  check('R3 tap after replay runs the full sequence again', elapsed >= 3000 && elapsed <= 5000,
    `measured ${Math.round(elapsed)}ms`)
  check('no page/console errors (replay run)', errors.length === 0, errors.join(' | ').slice(0, 300))
  await context.close()
}

/* ── R3 · Locale switches never start or restart the sequence ────────────── */
{
  const { page, context } = await freshPage()
  await sleep(500)
  await page.evaluate(() => document.querySelector('[data-locale-btn="bn"]').click())
  await sleep(400)
  const bn = await page.evaluate(() => ({
    state: document.getElementById('cover').dataset.state,
    coverUp: getComputedStyle(document.getElementById('cover')).display !== 'none',
    lang: document.documentElement.lang,
    name: document.querySelector('.mask-line').textContent,
    nameVisible: getComputedStyle(document.querySelector('.mask-line')).opacity,
    cue: document.querySelector('.cover-cue').textContent,
    pressed: document.querySelector('[data-locale-btn="bn"]').getAttribute('aria-pressed'),
  }))
  check('R3 BN at idle re-labels cover instantly and stays idle',
    bn.state === 'idle' && bn.coverUp && bn.lang === 'bn' && bn.name === 'আয়েশা' &&
    bn.nameVisible > 0.9 && bn.cue.includes('ট্যাপ') && bn.pressed === 'true', JSON.stringify(bn))
  await page.screenshot({ path: `${OUT}/idle-bn-switch-390.png` })
  await sleep(1500)
  const stillIdle = await page.evaluate(() => document.getElementById('cover').dataset.state)
  check('R3 locale switch does not start the sequence', stillIdle === 'idle', `state=${stillIdle}`)
  await context.close()

  const { page: p2, context: c2 } = await freshPage({ url: BASE + '?lang=bn' })
  await sleep(500)
  const t0 = await p2.evaluate(() => performance.now())
  await tapCue(p2)
  await sleep(1000)
  await p2.evaluate(() => document.querySelector('[data-locale-btn="en"]').click())
  await coverGone(p2)
  const elapsed = await p2.evaluate(() => performance.now()) - t0
  const heroName = await p2.evaluate(() => document.querySelector('.hero-names span').textContent)
  check('R3 locale switch mid-sequence does not restart it (total time intact, hero follows new locale)',
    elapsed >= 3000 && elapsed <= 5000 && heroName === 'Ayesha Rahman', `${Math.round(elapsed)}ms hero="${heroName}"`)
  await p2.screenshot({ path: `${OUT}/hero-bn-390.png` })
  await c2.close()
}

/* ── R3 · Reduced-motion preference ignored: cinematic always plays ──────── */
{
  const { page, context, errors } = await freshPage({ reducedMotion: 'reduce' })
  await sleep(400)
  const rm = await page.evaluate(() => ({
    state: document.getElementById('cover').dataset.state,
    initials: getComputedStyle(document.querySelector('.mono-initials')).opacity,
    cue: getComputedStyle(document.querySelector('.cover-cue')).opacity,
    name: getComputedStyle(document.querySelector('.mask-line')).opacity,
  }))
  check('R3 reduced-motion preference ignored: poster visible instantly, still tap-gated',
    rm.state === 'idle' && rm.initials > 0.9 && rm.cue > 0.9 && rm.name > 0.9, JSON.stringify(rm))
  await page.screenshot({ path: `${OUT}/reduced-idle-390.png` })
  await tapCue(page)
  await sleep(3000)
  const mid = await page.evaluate(() => ({
    state: document.getElementById('cover').dataset.state,
    petals: document.querySelectorAll('.petal').length,
  }))
  check('R3 reduced-motion preference ignored: full cinematic plays (petals included)',
    mid.state === 'playing' && mid.petals > 0, JSON.stringify(mid))
  const t0 = await page.evaluate(() => performance.now())
  await coverGone(page, 6000)
  const elapsed = await page.evaluate(() => performance.now()) - t0
  check('R3 reduced-motion preference ignored: cinematic completes',
    elapsed >= 1200 && elapsed <= 5000, `${Math.round(elapsed)}ms`)
  check('no page/console errors (reduced run)', errors.length === 0, errors.join(' | ').slice(0, 300))
  await context.close()
}

/* ── R3 · Dependency blocking: GSAP missing → fail-safe static page ──────── */
{
  const { page, context, errors } = await freshPage({ blockGsap: true })
  await sleep(3600) // past the 3s boot guard
  const fb = await page.evaluate(() => ({
    jsClass: document.documentElement.classList.contains('js'),
    cover: !!document.getElementById('cover'),
    heroName: document.querySelector('.hero-names span')?.textContent,
    heroVisible: getComputedStyle(document.querySelector('.hero-names')).opacity,
    sections: ['hero', 'story', 'message', 'gallery', 'details', 'countdown', 'venue', 'rsvp', 'closing']
      .map((id) => document.getElementById(id).innerText.length),
  }))
  check('R3 GSAP blocked → fail-safe: cover removed, js class off, page fully readable',
    !fb.jsClass && !fb.cover && fb.heroVisible > 0.9 && fb.sections.every((n) => n > 40), JSON.stringify(fb))
  check('no unexpected errors beyond the expected GSAP warning (fail-safe run)',
    errors.every((e) => /gsap|Failed to load/i.test(e)), errors.join(' | ').slice(0, 300))
  await context.close()
}

/* ── No-JS: invitation fully readable, cover absent ──────────────────────── */
{
  const { page, context, errors } = await freshPage({ js: false })
  const nojs = await page.evaluate(() => ({
    coverHidden: (() => { const c = document.getElementById('cover'); return !c || getComputedStyle(c).display === 'none' })(),
    sections: ['hero', 'story', 'message', 'gallery', 'details', 'countdown', 'venue', 'rsvp', 'closing']
      .map(id => ({ id, text: document.getElementById(id).innerText.length })),
    date: document.querySelector('[data-i18n-date]').textContent,
    calendarHref: document.querySelector('[data-href="calendar"]').href,
  }))
  check('no-JS: cover hidden, all nine sections have meaningful text',
    nojs.coverHidden && nojs.sections.every(s => s.text > 40), JSON.stringify(nojs.sections))
  check('no-JS: static date + calendar fallback link intact',
    nojs.date.includes('December') && nojs.calendarHref.includes('calendar.google.com'))
  await page.screenshot({ path: `${OUT}/nojs-top-390.png` })
  await page.evaluate(() => document.getElementById('closing').scrollIntoView())
  await sleep(300)
  await page.screenshot({ path: `${OUT}/nojs-closing-390.png` })
  check('no-JS: zero console/page errors', errors.length === 0, errors.join(' | ').slice(0, 300))
  await context.close()
}

/* ── Locale persistence across reload (same browser context) ─────────────── */
{
  const context = await browser.createBrowserContext()
  const page1 = await context.newPage()
  await page1.setViewport({ width: 390, height: 844 })
  await page1.goto(BASE + '?lang=bn', { waitUntil: 'networkidle0' })
  await sleep(200)
  const page2 = await context.newPage()
  await page2.setViewport({ width: 390, height: 844 })
  await page2.goto(BASE, { waitUntil: 'networkidle0' })
  const persisted = await page2.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.title,
    coverName: document.querySelector('.mask-line')?.textContent,
  }))
  check('stored locale persists across reload (bn, no query param)',
    persisted.lang === 'bn' && persisted.coverName === 'আয়েশা' && persisted.title.includes('ইমরান'), JSON.stringify(persisted))
  await context.close()
}

await browser.disconnect()
const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} browser checks passed`)
process.exit(failed.length ? 1 : 0)
