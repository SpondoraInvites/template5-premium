// Background music verification (not part of npm test).
// Run: node test/audio-verify.mjs   (static server on :8125, Chrome on :9222)

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

async function fresh(context, { noJs = false, url = BASE } = {}) {
  const page = await context.newPage()
  await page.setViewport({ width: 390, height: 844 })
  if (noJs) await page.setJavaScriptEnabled(false)
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(url, { waitUntil: 'networkidle0' })
  await sleep(400)
  return { page, errors }
}

const audioState = (page) => page.evaluate(() => {
  const t = document.querySelector('.audio-toggle')
  return {
    present: !!t,
    hidden: t ? getComputedStyle(t).display === 'none' : null,
    pressed: t?.getAttribute('aria-pressed'),
    playing: t?.classList.contains('is-playing'),
    label: t?.getAttribute('aria-label'),
    audioExists: !!document.querySelector('audio'),
    paused: document.querySelector('audio')?.paused ?? null,
    volume: document.querySelector('audio') ? +(+document.querySelector('audio').volume).toFixed(2) : null,
    loop: document.querySelector('audio')?.loop ?? null,
    pref: localStorage.getItem('invitation:audio'),
  }
})

// A1 · no JS: toggle hidden, no audio element
{
  const context = await browser.createBrowserContext()
  const { page } = await fresh(context, { noJs: true })
  const st = await audioState(page)
  check('A1 no-JS: toggle hidden, no audio element', st.hidden === true && !st.audioExists, JSON.stringify(st))
  await context.close()
}

// A2 · default preference: first gesture (cover tap) starts music with a fade
{
  const context = await browser.createBrowserContext()
  const { page } = await fresh(context)
  await page.evaluate(() => document.querySelector('.cover-cue').click())
  await sleep(1300) // fade completes
  const st = await audioState(page)
  check('A2 first gesture starts looped music, faded in, marked playing',
    st.audioExists && st.paused === false && st.pressed === 'true' && st.playing === true &&
    st.loop === true && st.volume >= 0.45 && st.volume <= 0.55, JSON.stringify(st))

  // A3 · toggle click fades out, pauses, persists 'off'
  await page.evaluate(() => document.querySelector('.audio-toggle').click())
  await sleep(1400) // fade-out completes
  const off = await audioState(page)
  check('A3 toggle pauses with fade and persists the off preference',
    off.paused === true && off.pressed === 'false' && off.playing === false && off.volume === 0 && off.pref === 'off', JSON.stringify(off))

  // A4 · reload in the same context: 'off' respected — tap must NOT start music
  await page.reload({ waitUntil: 'networkidle0' })
  await sleep(400)
  await page.evaluate(() => document.querySelector('.cover-cue').click())
  await sleep(1300)
  const stayedOff = await audioState(page)
  check('A4 persisted off preference respected across reload (no autoplay)',
    stayedOff.paused === true && stayedOff.pressed === 'false' && stayedOff.pref === 'off', JSON.stringify(stayedOff))

  // A5 · toggle back on: gesture plays again, pref persisted 'on'
  await page.evaluate(() => document.querySelector('.audio-toggle').click())
  await sleep(1400)
  const backOn = await audioState(page)
  check('A5 toggle resumes playback and persists the on preference',
    backOn.paused === false && backOn.playing === true && backOn.pref === 'on' && backOn.volume >= 0.45, JSON.stringify(backOn))
  check('A5 localized aria label (EN)', backOn.label === 'Pause background music', backOn.label)
  await page.screenshot({ path: `${OUT}/audio-playing-390.png` })
  await context.close()
}

// A6 · Bengali label + muted slash styling while off
{
  const context = await browser.createBrowserContext()
  const { page, errors } = await fresh(context, { url: BASE + '?lang=bn' })
  await page.evaluate(() => document.querySelector('.cover-cue').click())
  await sleep(1300)
  await page.evaluate(() => document.querySelector('.audio-toggle').click())
  await sleep(1400)
  const bn = await page.evaluate(() => ({
    label: document.querySelector('.audio-toggle').getAttribute('aria-label'),
    slash: getComputedStyle(document.querySelector('.audio-toggle'), '::after').width,
  }))
  check('A6 Bengali label and visible muted slash when off',
    bn.label === 'ব্যাকগ্রাউন্ড মিউজিক চালু করুন' && parseFloat(bn.slash) > 0, JSON.stringify(bn))
  check('no page/console errors (BN run)', errors.length === 0, errors.join(' | ').slice(0, 300))
  await context.close()
}

await browser.disconnect()
const pass = results.filter((r) => r.ok).length
console.log(`${pass}/${results.length} audio checks passed`)
if (pass !== results.length) process.exit(1)
process.exit(0)
