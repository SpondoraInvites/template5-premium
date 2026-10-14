// Background music — soft, looped, optional. The visitor's first gesture (the
// cover tap, keyboard activation, or the toggle itself) starts playback when
// the preference allows; every volume change fades; the choice persists in
// localStorage. The browser's autoplay rules are respected: play() is only
// ever attempted from inside a user-gesture call stack.

import { config } from './config.js'
import { translate } from './i18n.js'

const PREF_KEY = 'invitation:audio'

export function initAudio() {
  if (!config.audio?.ready || !config.audio.src) return
  const toggle = document.querySelector('.audio-toggle')
  if (!toggle) return

  let stored = null
  try { stored = localStorage.getItem(PREF_KEY) } catch { /* private mode */ }
  // Default is on — but nothing plays until the visitor's first gesture.
  let desired = stored === 'off' ? 'off' : 'on'

  const audio = new Audio(config.audio.src)
  audio.loop = true
  audio.preload = 'none'
  audio.volume = 0
  document.body.appendChild(audio)

  const target = config.audio.volume ?? 0.5
  const { gsap } = window

  const render = () => {
    const on = desired === 'on' && !audio.paused
    toggle.classList.toggle('is-playing', on)
    toggle.setAttribute('aria-pressed', String(desired === 'on'))
    const label = translate(on ? 'audio.pause' : 'audio.play', lang())
    toggle.setAttribute('aria-label', label)
    toggle.setAttribute('title', label)
  }

  const lang = () => document.documentElement.lang || config.defaultLocale

  const fadeTo = (value, then) => {
    if (gsap) gsap.to(audio, { volume: value, duration: 0.9, ease: 'power1.inOut', overwrite: true, onComplete: then })
    else { audio.volume = value; then?.() }
  }

  const start = () => {
    audio.play().then(() => {
      render()
      fadeTo(target)
    }).catch(() => {
      // Playback refused (autoplay policy edge) — stay off, visitor can tap.
      desired = 'off'
      render()
    })
  }

  const stop = () => {
    // Keep currentTime so unmuting resumes where the humming left off.
    fadeTo(0, () => audio.pause())
  }

  const apply = () => {
    render()
    if (desired === 'on') start()
    else stop()
    try { localStorage.setItem(PREF_KEY, desired) } catch { /* private mode */ }
  }

  toggle.addEventListener('click', () => {
    desired = desired === 'on' ? 'off' : 'on'
    apply()
  })

  // First gesture anywhere (the cover tap is the natural one) — start quietly
  // if the preference allows. A click carries user activation in every
  // browser, which play() requires; pointerdown alone does not in Chrome.
  const firstGesture = () => {
    // Re-read the preference here: storage may have changed since boot, and
    // test harnesses seed 'off' to keep silent during their checks.
    try { if (localStorage.getItem(PREF_KEY) === 'off') desired = 'off' } catch { /* private mode */ }
    if (desired === 'on' && audio.paused) start()
  }
  document.addEventListener('click', firstGesture, { capture: true, once: true })

  document.addEventListener('invitation:locale', render)
  render()
}
