// Stage-2 browser verification — six section compositions, scroll choreography,
// countdown, ambient particles, locale-mid-scroll behaviour. Not part of npm test.
// Run: node test/stage2-verify.mjs   (static server on :8125, Chrome on :9222)
// Screenshots → /tmp/verify/stage2-*.

import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'

const require = createRequire('/home/ashik/.agents/skills/browser-tools/package.js')
const puppeteer = require('puppeteer-core')
const BASE = 'http://localhost:8125/index.html'
const OUT = '/tmp/verify'
mkdirSync(OUT, { recursive: true })

const ISO = '2026-12-11T16:00:00+06:00' // mirrors js/config.js sample data
const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok })
  console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ' — ' + detail : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null })

async function freshPage({ width = 390, height = 844, locale = 'en', reducedMotion = 'no-preference' } = {}) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width, height })
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reducedMotion }])
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(BASE + (locale === 'bn' ? '?lang=bn' : ''), { waitUntil: 'networkidle0', timeout: 30000 })
  await page.evaluate(() => localStorage.setItem('invitation:audio', 'off'))
  return { page, context, errors }
}

// Enter the invitation (tap cue → cinematic → open), then settle.
async function enter(page) {
  await page.evaluate(() => document.querySelector('.cover-cue').click())
  await page.waitForFunction(() => {
    const c = document.getElementById('cover')
    return !c || getComputedStyle(c).display === 'none'
  }, { polling: 100, timeout: 9000 })
  await sleep(1400) // hero hand-off stagger completes
}

const scrollTo = (page, expr) => page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), expr)
const scrollToSel = (page, sel, offset = -100) => page.evaluate(({ sel, offset }) => {
  const top = document.querySelector(sel).getBoundingClientRect().top + window.scrollY + offset
  window.scrollTo({ top, behavior: 'instant' })
}, { sel, offset })
const scrollToEnd = (page) => page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))

// Expected localized countdown for the sample ISO (mirrors lib logic).
function expectedParts(nowMs) {
  let diff = Date.parse(ISO) - nowMs
  const past = diff <= 0
  if (past) diff = 0
  const s = Math.floor(diff / 1000)
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60, past }
}
const fmt = (n, lang) => new Intl.NumberFormat(lang, { useGrouping: false }).format(Math.max(0, Math.floor(n)))

// All countdown strings the config clock can legitimately display at a sample
// taken at nowMs. The display refreshes at 1Hz (setInterval), so the rendered
// value may be up to ~1.5s stale — instantaneous equality is wrong at second
// boundaries no matter how the sample is timed. Candidates over that window
// keep the assertion exact (config-derived digits only) and deterministic.
function expectedJoins(nowMs, lang) {
  const joins = new Set()
  for (const dt of [0, 500, 1000, 1500]) {
    const p = expectedParts(nowMs - dt)
    joins.add([p.days, p.hours, p.minutes, p.seconds].map((n) => fmt(n, lang)).join('/'))
  }
  return joins
}

async function readCountdown(page) {
  return page.evaluate(() => {
    const units = [...document.querySelectorAll('#countdown .cd-unit')]
    return {
      nowMs: Date.now(), // sampled atomically with the text below
      count: units.length,
      nums: units.map((u) => u.querySelector('.cd-num')?.textContent ?? null),
      labels: units.map((u) => u.querySelector('.cd-label')?.textContent ?? null),
      timerRole: document.querySelector('#countdown .countdown')?.getAttribute('role'),
      visible: units.length > 0 && [...units].every((u) => getComputedStyle(u).display !== 'none'),
    }
  })
}

/* ── S1 · Countdown: live, correct, localized, clamped in the past ───────── */
{
  const { page, context, errors } = await freshPage()
  await enter(page)
  const cd = await readCountdown(page)
  const lang = await page.evaluate(() => document.documentElement.lang)
  const joins = [...expectedJoins(cd.nowMs, lang)]
  check('S1 countdown renders 4 live units matching config time (EN digits, 1Hz-stale safe)',
    cd.count === 4 && cd.visible && cd.timerRole === 'timer' && joins.includes(cd.nums.join('/')),
    JSON.stringify({ cd, joins }))
  check('S1 countdown labels are EN and localized (Days/Hours/Minutes/Seconds)',
    cd.labels.join('/') === 'Days/Hours/Minutes/Seconds', cd.labels.join('/'))

  // Ticks: settle-wait for the next 1Hz tick instead of a fixed sleep straddling it.
  await page.waitForFunction(
    (prev) => document.querySelector('.cd-num[data-cd="seconds"]')?.textContent !== prev,
    { polling: 100, timeout: 3000 }, cd.nums[3])
  const ticked = await readCountdown(page)
  check('S1 countdown ticks live (seconds advance within 3s)',
    cd.nums[3] !== ticked.nums[3], `${cd.nums[3]} → ${ticked.nums[3]}`)

  // Past clamp: shift the clock beyond the event; all units must zero out.
  await page.evaluate(() => {
    window.__realNow = Date.now
    Date.now = () => window.__realNow() + 400 * 24 * 3600 * 1000
  })
  await page.waitForFunction(() =>
    [...document.querySelectorAll('#countdown .cd-num')].map((n) => n.textContent).join('/') === '0/0/0/0',
    { polling: 200, timeout: 3000 })
  const past = await readCountdown(page)
  check('S1 past event clamps countdown to zeros (never negative)',
    past.nums.join('/') === '0/0/0/0', past.nums.join('/'))
  await page.evaluate(() => { Date.now = window.__realNow })
  check('no console/page errors (countdown run)', errors.length === 0, errors.join(' | ').slice(0, 300))
  await context.close()

  // Bengali: labels + Bengali numerals.
  const { page: pb, context: cb } = await freshPage({ locale: 'bn' })
  await enter(pb)
  const cdb = await readCountdown(pb)
  const joinsBn = [...expectedJoins(cdb.nowMs, 'bn')]
  check('S1 BN countdown: Bengali labels and Bengali digits (1Hz-stale safe)',
    cdb.labels.join('/') === 'দিন/ঘণ্টা/মিনিট/সেকেন্ড' && joinsBn.includes(cdb.nums.join('/')),
    JSON.stringify({ nums: cdb.nums, labels: cdb.labels, joinsBn }))
  check('S1 BN countdown timer aria-label localized',
    await pb.evaluate(() => document.querySelector('#countdown .countdown')?.getAttribute('aria-label') === 'বিয়ের অনুষ্ঠানের বাকি সময়'))
  await pb.evaluate(() => document.getElementById('countdown').scrollIntoView())
  await sleep(700)
  await pb.screenshot({ path: `${OUT}/stage2-countdown-bn-390.png` })
  await cb.close()
}

/* ── S2 · Six distinct compositions: hooks exist and animate on scroll ───── */
{
  const { page, context, errors } = await freshPage()
  await enter(page)

  // Hero: botanical frame paths + leaves present (drawn once revealed).
  const hero = await page.evaluate(() => ({
    stems: document.querySelectorAll('#hero .sprig .draw').length,
    leaves: document.querySelectorAll('#hero .sprig .leaf').length,
    parallax: getComputedStyle(document.querySelector('#hero .sprig--tl')).transform,
  }))
  check('S2 hero botanical frame has draw stems + unfolding leaves', hero.stems >= 6 && hero.leaves >= 2, JSON.stringify(hero))

  // Message: typographic mask hidden before trigger, revealed after scroll.
  await scrollTo(page, 0)
  const msgBefore = await page.evaluate(() => {
    const line = document.querySelector('#message .mask-line')
    const draw = document.querySelector('#message .divider .draw')
    return {
      hasMask: !!line,
      maskT: line ? getComputedStyle(line).transform : null,
      hasDraw: !!draw,
      drawOffset: draw ? Math.round(parseFloat(getComputedStyle(draw).strokeDashoffset)) : null,
    }
  })
  check('S2 message: masked heading starts hidden (typographic mask, not fade-up)',
    msgBefore.hasMask && msgBefore.maskT !== 'none' && !msgBefore.maskT.includes('matrix(1, 0, 0, 1, 0, 0)'),
    JSON.stringify(msgBefore))
  check('S2 message: ornamental separator is a prepped path draw (dashoffset > 0)',
    msgBefore.hasDraw && msgBefore.drawOffset > 10, JSON.stringify(msgBefore))
  await scrollToSel(page, '#message')
  await sleep(1100)
  const msgAfter = await page.evaluate(() => {
    const line = document.querySelector('#message .mask-line')
    const draw = document.querySelector('#message .divider .draw')
    const quote = document.querySelector('#message blockquote')
    return {
      maskT: line ? getComputedStyle(line).transform : 'missing',
      drawOffset: draw ? Math.round(parseFloat(getComputedStyle(draw).strokeDashoffset)) : -1,
      quote: quote ? getComputedStyle(quote).opacity : 0,
    }
  })
  check('S2 message: mask risen + separator drawn + quote revealed after scroll',
    msgAfter.maskT.includes('matrix(1, 0, 0, 1, 0, 0)') && msgAfter.drawOffset === 0 && msgAfter.quote > 0.9,
    JSON.stringify(msgAfter))
  await page.screenshot({ path: `${OUT}/stage2-message-en-390.png` })

  // Details: printed plate + staggered rows + calendar CTA built from config.
  await scrollToSel(page, '#details', -120)
  await sleep(1100)
  const details = await page.evaluate(() => {
    const plate = document.querySelector('#details .plate')
    const cta = document.querySelector('#details .cta')
    return {
      plate: plate ? getComputedStyle(plate).borderTopWidth : 'missing',
      rows: [...document.querySelectorAll('#details .details > div')].map((r) => getComputedStyle(r).opacity),
      cal: document.querySelector('[data-href="calendar"]')?.href ?? '',
      cta: cta ? getComputedStyle(cta).opacity : 0,
    }
  })
  check('S2 details: printed plate frame + all rows revealed + CTA visible',
    parseFloat(details.plate) > 0 && details.rows.length === 4 && details.rows.every((o) => o > 0.9) && details.cta > 0.9,
    JSON.stringify({ plate: details.plate, rows: details.rows, cta: details.cta }))
  const calOk = (() => { try {
    const cal = new URL(details.cal)
    return cal.searchParams.get('dates') === '20261211T100000Z/20261211T120000Z' &&
      cal.searchParams.get('text') === 'Wedding of Ayesha & Imran' &&
      (cal.searchParams.get('location') ?? '').includes('Lakeshore')
  } catch { return false } })()
  check('S2 calendar href rebuilt from config (UTC dates + localized title)', calOk, details.cal.slice(0, 120))
  await page.screenshot({ path: `${OUT}/stage2-details-en-390.png` })

  // Venue: scrubbed botanical transition (stem draws with scroll progress).
  const venueTop = await page.evaluate(() => document.querySelector('#venue').getBoundingClientRect().top + window.scrollY)
  await scrollTo(page, venueTop - (await page.evaluate(() => window.innerHeight)) + 200) // just before trigger zone
  await sleep(700)
  const vBefore = await page.evaluate(() => {
    const stem = document.querySelector('#venue .venue-sprig .stem')
    return stem ? Math.round(parseFloat(getComputedStyle(stem).strokeDashoffset)) : -1
  })
  await scrollTo(page, venueTop - 80)
  await sleep(900)
  const vAfter = await page.evaluate(() => {
    const stem = document.querySelector('#venue .venue-sprig .stem')
    return {
      offset: stem ? Math.round(parseFloat(getComputedStyle(stem).strokeDashoffset)) : -1,
      leaves: [...document.querySelectorAll('#venue .venue-sprig .leaf')].map((l) => getComputedStyle(l).transform),
      map: document.querySelector('[data-href="maps"]')?.href ?? '',
    }
  })
  check('S2 venue: stem path draw scrubs with scroll (offset shrinks toward 0)',
    vBefore > 20 && vAfter.offset >= 0 && vAfter.offset < vBefore && vAfter.offset <= 12, `before=${vBefore} after=${vAfter.offset}`)
  check('S2 venue: leaves unfold on the drawn stem', vAfter.leaves.length >= 2 &&
    vAfter.leaves.every((t) => t !== 'none' && !t.includes('matrix(0')), JSON.stringify(vAfter.leaves))
  check('S2 maps href matches config venue url',
    vAfter.map === 'https://www.google.com/maps/search/?api=1&query=Lakeshore+Hotel+Gulshan+Dhaka', vAfter.map)
  await page.screenshot({ path: `${OUT}/stage2-venue-en-390.png` })

  // Closing: floral finale blooms (petals scaled up, signoff mask risen).
  await scrollToEnd(page)
  // Settled-state wait: the finale timeline runs ~2s after the trigger fires,
  // so sample only once every petal has finished blooming.
  await page.waitForFunction(() => {
    const petals = [...document.querySelectorAll('#closing .finale .flower-petal')]
    return petals.length > 0 && petals.every((p) => {
      const m = getComputedStyle(p).transform.match(/matrix\(([-\d.]+)/)
      return m && parseFloat(m[1]) >= 0.7
    })
  }, { polling: 100, timeout: 8000 })
  const closing = await page.evaluate(() => ({
    petals: [...document.querySelectorAll('#closing .finale .flower-petal')].map((p) => {
      const t = getComputedStyle(p).transform
      const m = t.match(/matrix\(([-\d.]+)/)
      return m ? parseFloat(m[1]) : 0
    }),
    stems: (() => { const s = document.querySelector('#closing .finale .stem'); return s ? Math.round(parseFloat(getComputedStyle(s).strokeDashoffset)) : -1 })(),
    signoff: getComputedStyle(document.querySelector('#closing .signoff')).opacity,
  }))
  check('S2 closing: floral finale blooms (stems drawn, petals scaled, signoff visible)',
    closing.petals.length >= 5 && closing.petals.every((s) => s > 0.7) && closing.stems >= 0 && closing.stems <= 4 && closing.signoff > 0.9,
    JSON.stringify(closing))
  await page.screenshot({ path: `${OUT}/stage2-closing-en-390.png` })
  check('no console/page errors (scroll choreography run)', errors.length === 0, errors.join(' | ').slice(0, 300))
  await context.close()
}

/* ── S3 · Ambient petals/leaves: limited, layered, never blocking ────────── */
{
  const { page, context, errors } = await freshPage()
  await enter(page)
  await sleep(600)
  const amb = await page.evaluate(() => {
    const layer = document.querySelector('.page-petals')
    if (!layer) return { layer: false }
    const bits = [...layer.children]
    return {
      layer: true,
      count: bits.length,
      pointerEvents: getComputedStyle(layer).pointerEvents,
      z: parseInt(getComputedStyle(layer).zIndex) || 0,
      widths: [...new Set(bits.map((b) => b.getBoundingClientRect().width.toFixed(1)))].length,
      drifting: bits.some((b) => { const t = getComputedStyle(b).transform; return t !== 'none' && !t.includes('matrix(1, 0, 0, 1, 0, 0)') }),
    }
  })
  check('S3 ambient layer exists with limited particles (6–14), transform-only drift',
    amb.layer && amb.count >= 6 && amb.count <= 14 && amb.drifting, JSON.stringify(amb))
  check('S3 ambient layer never blocks controls (pointer-events none, below locale toggle z)',
    amb.pointerEvents === 'none' && amb.z < 60, `pe=${amb.pointerEvents} z=${amb.z}`)
  // Locale toggle still clickable while particles drift.
  await page.evaluate(() => document.querySelector('[data-locale-btn="bn"]').click())
  await sleep(200)
  const lang = await page.evaluate(() => document.documentElement.lang)
  check('S3 locale toggle clickable above ambient particles', lang === 'bn', `lang=${lang}`)

  // Hidden tab pauses particle + scroll work, visible resumes. The hidden
  // dispatch, the paused assertion and the freeze baseline (particle transform
  // + timeline time) must share ONE evaluate: sampling in a separate call
  // races a rAF frame that can advance the particle before the pause lands.
  // Freeze is exact equality on BOTH samples over a settle window (paused
  // tweens cannot move); resume is a settle-wait for real timeline AND
  // particle advancement, not a fixed sleep near a yoyo turning point.
  const hid = await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
    const el = document.querySelector('.page-petals .drift')
    return {
      paused: gsap.globalTimeline.paused(),
      transform: el ? getComputedStyle(el).transform : null,
      tl: gsap.globalTimeline.time(),
    }
  })
  await sleep(600)
  const frozen = await page.evaluate(() => {
    const el = document.querySelector('.page-petals .drift')
    return { transform: el ? getComputedStyle(el).transform : null, tl: gsap.globalTimeline.time() }
  })
  const vis = await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
    const el = document.querySelector('.page-petals .drift')
    return {
      playing: !gsap.globalTimeline.paused(),
      transform: el ? getComputedStyle(el).transform : null,
      tl: gsap.globalTimeline.time(),
    }
  })
  let resumed = true
  try {
    await page.waitForFunction((base) =>
      gsap.globalTimeline.time() > base.tl &&
      getComputedStyle(document.querySelector('.page-petals .drift')).transform !== base.transform,
    { polling: 100, timeout: 3000 }, vis)
  } catch { resumed = false }
  const froze = hid.paused && vis.playing && hid.transform !== null &&
    hid.transform === frozen.transform && hid.tl === frozen.tl
  check('S3 hidden tab freezes ambient drift + timeline exactly, visible resumes both',
    froze && resumed, `paused=${hid.paused} tl=${hid.tl}→${frozen.tl} resumed=${resumed}`)
  check('no console/page errors (ambient run)', errors.length === 0, errors.join(' | ').slice(0, 300))
  await context.close()
}

/* ── S4 · Reduced-motion preference ignored: choreography still runs ─────── */
{
  const { page, context, errors } = await freshPage({ reducedMotion: 'reduce' })
  await enter(page)
  await scrollToSel(page, '#message', 0)
  await sleep(1600)
  const rm = await page.evaluate(() => ({
    petals: document.querySelectorAll('.page-petals .drift').length,
    msgMaskT: (() => { const l = document.querySelector('#message .mask-line'); return l ? getComputedStyle(l).transform : 'missing' })(),
    drawOffset: (() => { const d = document.querySelector('#message .divider .draw'); return d ? Math.round(parseFloat(getComputedStyle(d).strokeDashoffset)) : null })(),
  }))
  check('S4 reduced-motion preference ignored: particles spawn, scroll draws/masks run',
    rm.petals > 0 && (rm.msgMaskT === 'none' || rm.msgMaskT.includes('matrix(1, 0, 0, 1, 0, 0)')) &&
    rm.drawOffset === 0, JSON.stringify(rm))
  const sec1 = await readCountdown(page)
  let sec2 = sec1.nums[3]
  try {
    await page.waitForFunction(
      (prev) => document.querySelector('.cd-num[data-cd="seconds"]')?.textContent !== prev,
      { polling: 100, timeout: 3000 }, sec1.nums[3])
    sec2 = (await readCountdown(page)).nums[3]
  } catch { /* not ticked */ }
  check('S4 reduced-motion preference ignored: countdown still ticks',
    sec1.visible && sec1.nums[3] !== sec2, `${sec1.nums[3]} → ${sec2}`)
  check('no console/page errors (reduced run)', errors.length === 0, errors.join(' | ').slice(0, 300))
  await context.close()
}

/* ── S5 · Locale switch midway scroll: reflows in place, no reset/errors ─── */
{
  const { page, context, errors } = await freshPage()
  await enter(page)
  await scrollToSel(page, '#venue', -200)
  await sleep(800)
  const venueTopBefore = await page.evaluate(() => document.querySelector('#venue').getBoundingClientRect().top)
  await page.evaluate(() => document.querySelector('[data-locale-btn="bn"]').click())
  await sleep(900)
  const mid = await page.evaluate((topBefore) => ({
    lang: document.documentElement.lang,
    heading: document.querySelector('#venue h2').textContent,
    coverGone: getComputedStyle(document.getElementById('cover') ?? document.body).display === 'none',
    // BN text above is taller; ScrollTrigger compensates scroll so the same
    // content stays anchored in view — assert visual stability, not raw scrollY.
    venueTopDelta: Math.abs(document.querySelector('#venue').getBoundingClientRect().top - topBefore),
    y: window.scrollY,
  }), venueTopBefore)
  check('S5 locale switch midway scroll: BN strings in place, cover stays dismissed, view stays anchored (no jump)',
    mid.lang === 'bn' && mid.heading.includes('কীভাবে') && mid.coverGone && mid.venueTopDelta < 80,
    JSON.stringify(mid))
  const midCd = await page.evaluate(() => [...document.querySelectorAll('#countdown .cd-num')].map((n) => n.textContent).join('/'))
  check('S5 countdown re-rendered in Bengali after mid-scroll switch',
    /[\u09E6-\u09EF]/.test(midCd), midCd)
  // Scroll on in BN: choreography continues, no overflow, no restart.
  await scrollToEnd(page)
  await sleep(1200)
  const end = await page.evaluate(() => ({
    signoff: document.querySelector('#closing .signoff').textContent,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    petals: document.querySelectorAll('.page-petals .drift').length,
  }))
  check('S5 scroll continues in BN after switch (signoff localized, no overflow, particles intact)',
    end.signoff.includes('আয়েশা') && end.overflow <= 0 && end.petals > 0, JSON.stringify(end))
  await page.screenshot({ path: `${OUT}/stage2-closing-bn-390.png` })
  check('no console/page errors (mid-scroll locale run)', errors.length === 0, errors.join(' | ').slice(0, 300))
  await context.close()
}

/* ── S6 · Overflow + desktop sweep across widths/locales ─────────────────── */
for (const [w, h] of [[360, 740], [390, 844], [430, 932], [1440, 900]]) {
  for (const locale of ['en', 'bn']) {
    const { page, context, errors } = await freshPage({ width: w, height: h, locale })
    await enter(page)
    const ids = ['story', 'message', 'gallery', 'details', 'countdown', 'venue', 'rsvp', 'closing']
    let overflowMax = 0
    for (const id of ids) {
      await scrollToSel(page, `#${id}`)
      await sleep(650)
      overflowMax = Math.max(overflowMax, await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth))
    }
    const tag = `${locale}-${w}`
    await page.evaluate(() => document.getElementById('closing').scrollIntoView())
    await sleep(900)
    await page.screenshot({ path: `${OUT}/stage2-final-${tag}.png` })
    check(`S6 ${w}px ${locale.toUpperCase()}: all sections scroll with zero horizontal overflow`,
      overflowMax <= 0, `maxOverflowPx=${overflowMax}`)
    check(`S6 ${w}px ${locale.toUpperCase()}: no console/page errors`, errors.length === 0,
      errors.join(' | ').slice(0, 200))
    await context.close()
  }
}

await browser.disconnect()
const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} stage-2 browser checks passed`)
process.exit(failed.length ? 1 : 0)
