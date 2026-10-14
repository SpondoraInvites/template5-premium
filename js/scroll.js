// Stage-2 scroll choreography: live localized countdown, per-section scroll
// compositions (masked type, path draws, scrubbed botanical, floral finale)
// and a limited ambient drift of petals/leaves. Content is visible by default;
// initial hidden states are only applied here when JS + GSAP + ScrollTrigger
// are all healthy, so any failure leaves the readable static page. All motion
// is transform/opacity only, pauses with the tab (cover.js pauses the global
// timeline), and always runs — the OS reduced-motion preference is
// intentionally ignored (template choice, matching the sibling templates).

import { config } from './config.js'
import { countdownParts, localizeNumber } from './lib/datetime.js'

const UNITS = ['days', 'hours', 'minutes', 'seconds']

// Direct style mutations: gsap.context().revert() only undoes what GSAP's own
// tweens recorded, so these need a manual snapshot to restore on failure.
function prepDraw(els, prepped) {
  for (const el of els) {
    prepped.push([el, el.getAttribute('style')])
    const len = el.getTotalLength()
    el.style.strokeDasharray = `${len} ${len}`
    el.style.strokeDashoffset = len
  }
}

export function initScroll() {
  /* ── live countdown — content, not decoration: runs with or without motion ── */
  const nums = Object.fromEntries(UNITS.map((u) => [u, document.querySelector(`.cd-num[data-cd="${u}"]`)]))
  let timer = null
  const renderCountdown = (animate) => {
    const lang = document.documentElement.lang || config.defaultLocale
    const parts = countdownParts(config.event.iso) // clamps past events to zeros
    for (const u of UNITS) {
      const el = nums[u]
      if (!el) continue
      const text = localizeNumber(parts[u], lang)
      if (el.textContent !== text) {
        el.textContent = text
        if (animate && window.gsap) {
          gsap.fromTo(el, { yPercent: -32, autoAlpha: 0.35 },
            { yPercent: 0, autoAlpha: 1, duration: 0.32, ease: 'power1.out', overwrite: 'auto' })
        }
      }
    }
    return parts.past
  }
  if (nums.days) {
    renderCountdown(false)
    timer = setInterval(() => { if (renderCountdown(true)) clearInterval(timer) }, 1000)
  }
  // Locale switch: digits re-render immediately (labels re-render via i18n.js).
  document.addEventListener('invitation:locale', () => {
    renderCountdown(false)
    window.ScrollTrigger?.refresh()
  })

  if (!window.gsap || !window.ScrollTrigger) return

  const { gsap, ScrollTrigger } = window
  const petalStagger = window.innerWidth < 700 ? 0.03 : 0.055 // per-viewport flower stagger
  const PETAL_SVG = '<svg viewBox="0 0 20 28" aria-hidden="true"><path d="M10 1 C16 8 16 18 10 27 C4 18 4 8 10 1 Z"/></svg>'
  const LEAF_SVG = '<svg viewBox="0 0 14 30" aria-hidden="true"><path d="M7 1 C12 8 13 19 7 29 C1 19 2 8 7 1 Z"/><path d="M7 5 L7 25"/></svg>'

  const prepped = []
  let ctx = null
  try {
    // Context is created (and assigned) BEFORE the choreography runs inside
    // it, so a mid-way throw still leaves a live handle to revert with.
    ctx = gsap.context(() => {})
    ctx.add(() => {
      /* 1 · Hero — botanical frame draws in, leaves unfold, sprigs parallax */
      prepDraw(document.querySelectorAll('#hero .sprig .draw'), prepped)
      gsap.to('#hero .sprig .draw', {
        strokeDashoffset: 0, duration: 1.4, stagger: 0.04, ease: 'power1.inOut',
        scrollTrigger: { trigger: '#hero', start: 'top 90%' },
      })
      gsap.fromTo('#hero .sprig .leaf', { scaleY: 0 }, {
        scaleY: 1, transformOrigin: '0% 50%', duration: 0.6, stagger: 0.08, ease: 'back.out(1.6)',
        scrollTrigger: { trigger: '#hero', start: 'top 90%' },
      })
      gsap.to('#hero .sprig--tl', {
        yPercent: 14, ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
      })
      gsap.to('#hero .sprig--br', {
        yPercent: -14, ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
      })

      /* 2 · Message — masked heading rise, ornamental separator draws, quote reveals */
      prepDraw(document.querySelectorAll('#message .divider--anim .draw'), prepped)
      gsap.set('#message .divider--anim .flourish-diamond', { scale: 0, autoAlpha: 0 })
      gsap.timeline({ scrollTrigger: { trigger: '#message', start: 'top 72%' } })
        .fromTo('#message .mask-line', { yPercent: 115 }, { yPercent: 0, duration: 0.85, ease: 'power3.out' }, 0)
        .to('#message .divider--anim .draw', { strokeDashoffset: 0, duration: 0.8, stagger: 0.15, ease: 'power1.inOut' }, 0.1)
        .to('#message .divider--anim .flourish-diamond', { scale: 1, autoAlpha: 1, duration: 0.4, ease: 'back.out(2)' }, 0.55)
        .fromTo('#message blockquote', { clipPath: 'inset(-1% 0% 101% 0%)', y: 14 },
          { clipPath: 'inset(-1% 0% -1% 0%)', y: 0, duration: 0.9, ease: 'power2.out' }, 0.3)
        .fromTo('#message [data-i18n="message.p2"]', { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.55)

      /* 3 · Details — letterpress rows settle inside the printed plate */
      prepDraw(document.querySelectorAll('#details .divider--anim .draw'), prepped)
      gsap.set('#details .divider--anim .flourish-diamond', { scale: 0, autoAlpha: 0 })
      gsap.timeline({ scrollTrigger: { trigger: '#details', start: 'top 70%' } })
        .to('#details .divider--anim .draw', { strokeDashoffset: 0, duration: 0.7, stagger: 0.14, ease: 'power1.inOut' }, 0)
        .to('#details .divider--anim .flourish-diamond', { scale: 1, autoAlpha: 1, duration: 0.4, ease: 'back.out(2)' }, 0.45)
        .fromTo('#details .details > div', { autoAlpha: 0, y: 26, rotationX: -8, transformOrigin: '50% 0%' },
          { autoAlpha: 1, y: 0, rotationX: 0, duration: 0.7, stagger: 0.11, ease: 'power2.out' }, 0.15)
        .fromTo('#details .cta', { autoAlpha: 0, scale: 0.92 },
          { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)' }, 0.7)

      /* 4 · Countdown — numbers rise out of their cells */
      gsap.fromTo('#countdown .cd-unit .mask-line', { yPercent: 115 }, {
        yPercent: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: '#countdown', start: 'top 70%' },
      })

      /* 5 · Venue — botanical transition: stems draw with scroll, leaves unfold */
      prepDraw(document.querySelectorAll('#venue .venue-sprig .stem'), prepped)
      gsap.timeline({ scrollTrigger: { trigger: '#venue', start: 'top 95%', end: 'top 40%', scrub: 0.6 } })
        .to('#venue .venue-sprig .stem', { strokeDashoffset: 0, stagger: 0.2, ease: 'none' }, 0)
        .fromTo('#venue .venue-sprig .leaf', { scaleY: 0 },
          { scaleY: 1, transformOrigin: '0% 50%', stagger: 0.08, ease: 'none' }, 0.3)
        .fromTo('#venue .venue-sprig .flower-petal', { scale: 0 },
          { scale: 1, stagger: petalStagger, ease: 'none' }, 0.55)

      /* 6 · Closing — gratitude masks rise, floral finale blooms */
      prepDraw(document.querySelectorAll('#closing .divider--anim .draw, #closing .finale .stem'), prepped)
      gsap.set('#closing .divider--anim .flourish-diamond', { scale: 0, autoAlpha: 0 })
      gsap.timeline({ scrollTrigger: { trigger: '#closing', start: 'top 62%' } })
        .fromTo('#closing .mask-line', { yPercent: 115 }, { yPercent: 0, duration: 0.85, stagger: 0.14, ease: 'power3.out' }, 0.05)
        .to('#closing .divider--anim .draw', { strokeDashoffset: 0, duration: 0.7, stagger: 0.12, ease: 'power1.inOut' }, 0.2)
        .to('#closing .divider--anim .flourish-diamond', { scale: 1, autoAlpha: 1, duration: 0.4, ease: 'back.out(2)' }, 0.6)
        .to('#closing .finale .stem', { strokeDashoffset: 0, duration: 1.05, stagger: 0.12, ease: 'power1.inOut' }, 0.3)
        .fromTo('#closing .finale .leaf', { scaleY: 0 },
          { scaleY: 1, transformOrigin: '50% 100%', duration: 0.55, stagger: 0.06, ease: 'back.out(1.6)' }, 0.75)
        .fromTo('#closing .finale .flower-petal', { scale: 0, rotation: -30, transformOrigin: '50% 100%' },
          { scale: 1, rotation: 0, duration: 0.6, stagger: petalStagger, ease: 'back.out(1.7)' }, 1.0)

      /* 7 · Story — heading mask, divider, moments settle in */
      prepDraw(document.querySelectorAll('#story .divider--anim .draw'), prepped)
      gsap.set('#story .divider--anim .flourish-diamond', { scale: 0, autoAlpha: 0 })
      gsap.timeline({ scrollTrigger: { trigger: '#story', start: 'top 70%' } })
        .fromTo('#story .mask-line', { yPercent: 115 }, { yPercent: 0, duration: 0.85, ease: 'power3.out' }, 0)
        .to('#story .divider--anim .draw', { strokeDashoffset: 0, duration: 0.75, stagger: 0.14, ease: 'power1.inOut' }, 0.15)
        .to('#story .divider--anim .flourish-diamond', { scale: 1, autoAlpha: 1, duration: 0.4, ease: 'back.out(2)' }, 0.5)
        .fromTo('#story .moment', { autoAlpha: 0, y: 26 },
          { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.16, ease: 'power2.out' }, 0.25)

      /* 8 · Gallery — images unveil with a soft clip + settle */
      prepDraw(document.querySelectorAll('#gallery .divider--anim .draw'), prepped)
      gsap.set('#gallery .divider--anim .flourish-diamond', { scale: 0, autoAlpha: 0 })
      gsap.timeline({ scrollTrigger: { trigger: '#gallery', start: 'top 72%' } })
        .fromTo('#gallery .mask-line', { yPercent: 115 }, { yPercent: 0, duration: 0.85, ease: 'power3.out' }, 0)
        .to('#gallery .divider--anim .draw', { strokeDashoffset: 0, duration: 0.75, stagger: 0.14, ease: 'power1.inOut' }, 0.1)
        .to('#gallery .divider--anim .flourish-diamond', { scale: 1, autoAlpha: 1, duration: 0.4, ease: 'back.out(2)' }, 0.45)
        .fromTo('#gallery .gallery-intro', { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out' }, 0.35)
        .fromTo('#gallery .gallery-item', { clipPath: 'inset(6% 6% 6% 6%)', autoAlpha: 0.001, scale: 1.05 },
          { clipPath: 'inset(0% 0% 0% 0%)', autoAlpha: 1, scale: 1, duration: 0.8, stagger: 0.08, ease: 'power2.out' }, 0.3)

      /* 9 · RSVP — heading, divider, the plate-framed form rises */
      prepDraw(document.querySelectorAll('#rsvp .divider--anim .draw'), prepped)
      gsap.set('#rsvp .divider--anim .flourish-diamond', { scale: 0, autoAlpha: 0 })
      gsap.timeline({ scrollTrigger: { trigger: '#rsvp', start: 'top 70%' } })
        .fromTo('#rsvp .mask-line', { yPercent: 115 }, { yPercent: 0, duration: 0.85, ease: 'power3.out' }, 0)
        .to('#rsvp .divider--anim .draw', { strokeDashoffset: 0, duration: 0.75, stagger: 0.14, ease: 'power1.inOut' }, 0.15)
        .to('#rsvp .divider--anim .flourish-diamond', { scale: 1, autoAlpha: 1, duration: 0.4, ease: 'back.out(2)' }, 0.5)
        .fromTo('#rsvp .rsvp-form', { autoAlpha: 0, y: 30 },
          { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 0.3)
    })
  } catch (err) {
    ctx?.revert() // kill partial tweens/ScrollTriggers, undo GSAP-set styles
    for (const [el, style] of prepped) style === null ? el.removeAttribute('style') : el.setAttribute('style', style)
    console.warn('[invitation] scroll choreography disabled:', err)
    return
  }

  /* ── ambient drift: layered petals/leaves, spawned only once the cover opens ── */
  const layer = document.querySelector('.page-petals')
  if (layer) {
    const spawn = () => {
      if (layer.children.length) return
      const utils = gsap.utils
      for (let i = 0; i < 9; i++) {
        const el = document.createElement('span')
        const kind = i % 3 // petal · sand petal · leaf — differing shape/opacity/scale/drift
        el.className = 'drift' + (kind === 0 ? ' drift--sand' : kind === 2 ? ' drift--leaf' : '')
        el.style.left = 3 + utils.random(0, 92) + '%'
        el.style.width = (kind === 2 ? 11 : 9) + utils.random(0, 10) + 'px'
        el.style.opacity = (0.3 + utils.random(0, 0.3)).toFixed(2)
        el.innerHTML = kind === 2 ? LEAF_SVG : PETAL_SVG
        layer.appendChild(el)
        gsap.fromTo(el, { y: '-9vh', rotation: utils.random(-60, 60) }, {
          y: '112vh',
          rotation: '+=' + utils.random(160, 420),
          duration: utils.random(12, 20),
          delay: utils.random(0, 8),
          repeat: -1,
          ease: 'none',
        })
        gsap.to(el, { x: () => utils.random(-34, 34), duration: utils.random(2.4, 4.6), repeat: -1, yoyo: true, ease: 'sine.inOut' })
      }
    }
    const clear = () => { gsap.killTweensOf(layer.children); layer.replaceChildren() }
    if (document.getElementById('cover')?.dataset.state === 'open') spawn()
    document.addEventListener('invitation:open', spawn)
    document.addEventListener('invitation:idle', clear)
  }
}
