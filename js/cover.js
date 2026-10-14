// Cinematic cover, tap-gated. The idle poster — monogram, family line, names,
// flourish, tap cue, locale toggle — is pure CSS, visible instantly, and waits
// indefinitely. A tap anywhere on the cover (or Enter/Space on the focused
// cue) plays the ≈4s choreography: monogram awakening → botanical line
// drawing → panels part onto ivory light + petals → masked names rise — then
// the invitation is entered automatically (no second tap). Skippable at any
// point; dev replay fully resets to the idle poster. The OS reduced-motion
// preference is intentionally ignored — animations always play (template
// choice, matching the sibling templates). The entry failsafe is only armed
// once the visitor taps, and it runs on GSAP's clock so hidden time doesn't
// count.

export function initCover() {
  const cover = document.getElementById('cover')
  const body = document.body
  if (!cover || !window.gsap) return { open() {}, replay() {}, isOpen: () => false }

  // While the cover gates the page, the invitation beneath it stays out of
  // the tab order and the accessibility tree (the locale toggle and dev
  // controls sit outside it and remain reachable).
  const pageMain = document.getElementById('invitation')
  const lockBackground = (lock) => {
    if (!pageMain) return
    lock ? pageMain.setAttribute('inert', '') : pageMain.removeAttribute('inert')
  }

  body.classList.add('cover-active')
  lockBackground(true)

  const q = (sel) => cover.querySelector(sel)
  const qa = (sel) => [...cover.querySelectorAll(sel)]
  const { gsap } = window

  const monoDraw = qa('.mono-art .draw')
  const sprigDraw = qa('.sprig .draw')
  const flourishDraw = qa('.cover-flourish .draw')
  const flourishDots = qa('.cover-flourish .dot')
  const flourishDiamond = qa('.cover-flourish .flourish-diamond')
  const flowerPetals = qa('.flower-petal')
  const nameLines = qa('.mask-line')
  const panels = [q('.cover-panel--top'), q('.cover-panel--bottom')]
  const mono = q('.cover-mono')
  const coverNames = q('.cover-names')
  const coverFlourish = q('.cover-flourish')
  const glow = q('.mono-glow')
  const light = q('.cover-light')
  const inner = q('.cover-inner')
  const sprigDots = qa('.sprig .dot')
  const initials = q('.mono-initials')
  const cue = q('.cover-cue')
  const skipBtn = q('.cover-skip')
  const heroTitle = document.querySelector('.hero-names')

  let state = 'idle' // idle → playing → open
  let tl = null
  let failsafe = null
  cover.dataset.state = 'idle'

  /* ── petals ────────────────────────────────────────────────────────────── */
  const petalsLayer = q('.cover-petals')
  const petalTweens = []
  const PETAL_SVG = '<svg viewBox="0 0 20 28" aria-hidden="true"><path d="M10 1 C16 8 16 18 10 27 C4 18 4 8 10 1 Z"/></svg>'

  function spawnPetals() {
    stopPetals()
    const utils = gsap.utils
    for (let i = 0; i < 10; i++) {
      const el = document.createElement('span')
      el.className = 'petal' + (i % 3 === 0 ? ' petal--sand' : '')
      el.style.left = 4 + utils.random(0, 92) + '%'
      el.style.width = 10 + utils.random(0, 8) + 'px'
      el.innerHTML = PETAL_SVG
      petalsLayer.appendChild(el)
      petalTweens.push(
        gsap.fromTo(el, { y: '-8vh', rotation: utils.random(-40, 40) }, {
          y: '112vh',
          rotation: '+=' + utils.random(120, 320),
          duration: utils.random(9, 16),
          delay: utils.random(0, 6),
          repeat: -1,
          ease: 'none',
        }),
        gsap.to(el, { x: () => utils.random(-30, 30), duration: utils.random(2, 4), repeat: -1, yoyo: true, ease: 'sine.inOut' }),
      )
    }
  }

  function stopPetals() {
    petalTweens.forEach((t) => t.kill())
    petalTweens.length = 0
    petalsLayer.replaceChildren()
  }

  /* ── line-drawing prep ─────────────────────────────────────────────────── */
  function prepDraw(els) {
    for (const el of els) {
      const len = el.getTotalLength()
      el.style.strokeDasharray = `${len} ${len}`
      el.style.strokeDashoffset = len
    }
  }

  /* ── entry (end of the sequence, skip, reduced motion or failsafe) ─────── */
  function enter(fast) {
    if (state === 'open') return
    state = 'open'
    cover.dataset.state = 'open'
    document.dispatchEvent(new CustomEvent('invitation:open'))
    if (failsafe) { failsafe.kill(); failsafe = null }
    if (tl) { tl.kill(); tl = null }
    stopPetals()
    gsap.killTweensOf([cover, ...panels, inner])
    gsap.set([skipBtn, cue], { autoAlpha: 0 })
    const done = () => {
      body.classList.remove('cover-active')
      cover.setAttribute('aria-hidden', 'true')
      cover.style.display = 'none'
      lockBackground(false)
    }
    // Direct reveal: the invitation fades in beneath the finished cover — no
    // sliding white/blue blocks between the reveal and the invitation.
    gsap.to(cover, { autoAlpha: 0, duration: fast ? 0.25 : 0.5, ease: 'power1.inOut', onComplete: done })
    // The decorative sprigs are excluded: they have their own scroll-drawn
    // entrance and a resting opacity of 0.55 — tweening them to 1 flashed
    // them bold before snapping back thin.
    gsap.fromTo('.hero > :not(.sprig)', { autoAlpha: 0, y: 24 }, {
      autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out', delay: 0.3,
      clearProps: 'transform,opacity,visibility',
      onComplete: () => heroTitle?.focus({ preventScroll: true }), // focus once visible
    })
  }

  /* ── activation: the visitor's tap starts the choreography ─────────────── */
  function activate() {
    if (state !== 'idle') return
    state = 'playing'
    cover.dataset.state = 'playing'

    // Failsafe on GSAP's clock: pauses with the page (hidden time never
    // counts) and can never override the intentional idle before a tap.
    failsafe = gsap.delayedCall(9, () => enter(true))

    // Sequence start states — the idle poster itself is never pre-hidden.
    prepDraw(monoDraw); prepDraw(sprigDraw); prepDraw(flourishDraw)
    gsap.set(flowerPetals, { scale: 0, rotation: -40, transformOrigin: '50% 100%' })
    gsap.set(flourishDiamond, { scale: 0, autoAlpha: 0, transformOrigin: '50% 50%' })
    gsap.set(initials, { scale: 0.94 })
    gsap.set(light, { autoAlpha: 0 })
    gsap.set(sprigDots, { autoAlpha: 0 })
    gsap.set(flourishDots, { autoAlpha: 0 })
    // GSAP owns the monogram transform from here on. Zeroing the parsed px
    // offsets is essential: the CSS idle transform `translate(-50%, -100%)`
    // is read as pixel x/y, and adding x/yPercent on top double-offsets the
    // block — the leap the monogram made on activation. x:0/y:0 + percents
    // renders identically to the idle poster, then the tween glides cleanly.
    gsap.set(mono, { x: 0, y: 0, xPercent: -50, yPercent: -100 })
    // FLIP: pin the poster content to its idle position when the layout
    // switches, then glide it to centre. The container is a full-screen box
    // (inset: 0) whose rect never moves — measure the names block instead,
    // or the compensation computes to zero and the letters teleport up.
    const idleTop = coverNames.getBoundingClientRect().top
    cover.classList.remove('is-idle')
    cover.classList.add('is-revealing')
    gsap.set(inner, { y: idleTop - coverNames.getBoundingClientRect().top })

    const t = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' }, onComplete: () => enter(false) })

    // I · The name yields first — on tap it dissolves alone, one clear beat
    // before anything else moves (0–0.5s)
    t.to(cue, { autoAlpha: 0, duration: 0.35 }, 0)
    t.to([coverNames, coverFlourish], { autoAlpha: 0, duration: 0.5, ease: 'power1.inOut' }, 0)

    // II · The poster yields — monogram lifts clear above the panel seam (so
    // the parting panels can never slice it) while the block rises and the
    // awakening begins (0.5–1.6s)
    t.to(mono, { yPercent: -118, duration: 0.85, ease: 'power2.inOut' }, 0.5)
    t.to(inner, { y: 0, duration: 0.9, ease: 'power2.inOut' }, 0.5)
    // Once dissolved, move the lines behind their masks for the later rise.
    t.set(nameLines, { yPercent: 115 }, 0.55)
    t.fromTo(glow, { autoAlpha: 0.35, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 1.0, ease: 'sine.out' }, 0.5)
    t.to(monoDraw, { strokeDashoffset: 0, duration: 1.1, ease: 'power1.inOut', stagger: 0.12 }, 0.5)
    t.to(initials, { scale: 1, duration: 0.8 }, 0.85)

    // III · Stems & leaves draw, flower unfolds (0.95–2.2s)
    t.to(sprigDraw, { strokeDashoffset: 0, duration: 1.25, ease: 'power1.inOut', stagger: 0.035 }, 0.95)
    t.to(flowerPetals, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.7)', stagger: 0.06 }, 1.7)
    t.to(sprigDots, { autoAlpha: 1, duration: 0.5 }, 1.95)

    // IV · Navy panels part, ivory light blooms, petals begin (2.05–3.5s).
    // The poster look is dropped here — the closed panels hide the switch.
    t.add(() => cover.classList.remove('is-revealing'), 2.0)
    t.to(panels[0], { yPercent: -101, duration: 1.15, ease: 'power3.inOut' }, 2.05)
    t.to(panels[1], { yPercent: 101, duration: 1.15, ease: 'power3.inOut' }, 2.05)
    t.to(mono, { autoAlpha: 0, duration: 0.65, ease: 'power1.in' }, 2.15)
    t.fromTo(light, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 0.9, scale: 1, duration: 1.2, ease: 'sine.out' }, 2.2)
    t.add(spawnPetals, 2.35)

    // V · Masked names rise + flourish redraws (2.85–4.05s). The faded parents
    // come back first — invisible, since the lines sit behind their masks and
    // the flourish paths are still dash-hidden.
    t.set(coverNames, { autoAlpha: 1 }, 2.85)
    t.set(coverFlourish, { autoAlpha: 1 }, 3.2)
    t.to(nameLines, { yPercent: 0, duration: 0.8, ease: 'power3.out', stagger: 0.14 }, 2.9)
    t.to(flourishDraw, { strokeDashoffset: 0, duration: 0.7, ease: 'power1.inOut' }, 3.2)
    t.to(flourishDots, { autoAlpha: 1, duration: 0.4 }, 3.45)
    t.to(flourishDiamond, { scale: 1, autoAlpha: 1, duration: 0.45, ease: 'back.out(2.2)' }, 3.6)

    tl = t
    t.play(0)
  }

  /* ── dev replay: full reset to the idle poster (monogram included) ─────── */
  function replay() {
    if (state !== 'open') return
    if (!cover.isConnected) return // fallback detached the cover — the static page owns it now
    if (failsafe) { failsafe.kill(); failsafe = null }
    if (tl) { tl.kill(); tl = null }
    stopPetals()
    const reset = [cover, ...panels, mono, glow, light, inner, initials, cue, skipBtn,
      coverNames, coverFlourish,
      ...nameLines, ...monoDraw, ...sprigDraw, ...flourishDraw, ...flourishDots, ...flowerPetals, ...flourishDiamond]
    gsap.killTweensOf(reset)
    gsap.set(reset, { clearProps: 'all' })
    for (const el of [...monoDraw, ...sprigDraw, ...flourishDraw]) {
      el.style.strokeDasharray = ''
      el.style.strokeDashoffset = ''
    }
    cover.classList.add('is-idle')
    cover.classList.remove('is-revealing')
    cover.style.display = ''
    cover.removeAttribute('aria-hidden')
    cover.dataset.state = 'idle'
    state = 'idle'
    body.classList.add('cover-active')
    lockBackground(true)
    cue?.focus({ preventScroll: true }) // focus was on the page the cover now occludes
    window.scrollTo(0, 0)
    document.dispatchEvent(new CustomEvent('invitation:idle'))
  }

  /* ── controls & safety ─────────────────────────────────────────────────── */
  // Any tap on the idle cover (cue included — its click bubbles) starts the
  // reveal; the skip button is excluded. Keyboard works via the buttons.
  cover.addEventListener('click', (e) => {
    if (e.target.closest('.cover-skip')) return
    activate()
  })
  skipBtn.addEventListener('click', () => {
    if (state === 'playing') tl && tl.progress(1, false) // onComplete → enter
    else if (state === 'idle') enter(true)
  })

  // Pause all cover work while the tab is hidden, resume on return.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) gsap.globalTimeline.pause()
    else gsap.globalTimeline.play()
  })

  return { open: () => enter(true), replay, isOpen: () => state === 'open' }
}
