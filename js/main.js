// Entry point — boots only when dependencies are healthy; any failure falls
// back to the fully readable static page (fail-safe, never traps the user).

import { config } from './config.js'
import { resolveLocale, readStoredLocale, persistLocale } from './lib/locale.js'
import { applyLocale } from './i18n.js'
import { initCover } from './cover.js'
import { initScroll } from './scroll.js'
import { initRsvp } from './rsvp.js'
import { initShare } from './share.js'
import { initLightbox } from './lightbox.js'
import { initAudio } from './audio.js'

const html = document.documentElement
window.__invitationBooted = false

function safeStorage() {
  try { return window.localStorage } catch { return null }
}

function getUrlLocale() {
  const params = new URLSearchParams(window.location.search)
  return params.get('lang') || params.get('locale')
}

function currentLocale() {
  const storage = safeStorage()
  return resolveLocale({
    urlParam: getUrlLocale(),
    stored: storage ? readStoredLocale(storage) : null,
    supported: config.locales,
    fallback: config.defaultLocale,
  })
}

function failSafe(cause) {
  console.warn('[invitation] fail-safe — serving static page:', cause)
  html.classList.remove('js')
  document.body.classList.remove('cover-active')
  // The gate may already be armed (initCover ran) — unlock the static page.
  document.getElementById('invitation')?.removeAttribute('inert')
  document.getElementById('cover')?.remove()
}

try {
  if (!window.gsap) throw new Error('GSAP unavailable')
  if (window.ScrollTrigger && gsap.registerPlugin) gsap.registerPlugin(ScrollTrigger)

  const storage = safeStorage()
  const locale = currentLocale()
  if (storage) persistLocale(storage, locale)
  applyLocale(locale)

  const coverCtl = initCover()
  // Scroll choreography guards itself: any internal failure just leaves the
  // fully readable static sections (it never throws out).
  initScroll()
  initRsvp()
  initShare()
  initLightbox()
  initAudio()

  // Locale switching: re-renders strings in place, persists the choice,
  // never restarts the reveal.
  for (const btn of document.querySelectorAll('[data-locale-btn]')) {
    btn.addEventListener('click', () => {
      const next = btn.dataset.localeBtn
      if (!config.locales.includes(next)) return
      if (storage) persistLocale(storage, next)
      applyLocale(next)
    })
  }

  // Dev replay: ?dev=1 reveals the replay control.
  if (new URLSearchParams(window.location.search).has('dev')) {
    const replayBtn = document.querySelector('.dev-replay')
    if (replayBtn) {
      replayBtn.hidden = false
      replayBtn.addEventListener('click', () => coverCtl.replay())
    }
  }

  window.__invitationBooted = true
} catch (err) {
  failSafe(err)
}
