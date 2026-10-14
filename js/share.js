// Share — any [data-share-button] paired (via aria-controls) with a
// [data-share-menu] opens the same channel options (copy link, WhatsApp,
// Messenger, Telegram, email). The venue section uses one inline; a floating
// one sticks to the bottom-right corner once the hero scrolls out of view.
// No backend: channels compose prefilled links; copying has a legacy-http
// fallback and localized feedback.

import { config } from './config.js'
import { translate } from './i18n.js'
import { formatEventDate } from './lib/datetime.js'

export function initShare() {
  if (!document.querySelector('[data-share-button]')) return

  const lang = () => document.documentElement.lang || config.defaultLocale
  const link = () => location.href
  const text = () =>
    `${translate('details.eventTitle', lang())} — ${formatEventDate(config.event.iso, config.event.timezone, lang())}`
  const enc = encodeURIComponent

  const makeActions = (menu) => {
    const copyButton = menu.querySelector('[data-share="copy"]')
    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(link())
      } catch {
        // Clipboard API needs a secure context — fall back for plain http.
        const ta = document.createElement('textarea')
        ta.value = link()
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        try { document.execCommand('copy') } catch { /* nothing more we can do */ }
        ta.remove()
      }
      const original = copyButton.textContent
      copyButton.textContent = translate('share.copied', lang())
      setTimeout(() => { copyButton.textContent = original }, 1600)
    }
    return {
      copy: copyLink,
      whatsapp: () => window.open(`https://wa.me/?text=${enc(`${text()}\n${link()}`)}`, '_blank', 'noopener'),
      // shortcut: deep link only opens the Messenger app (mobile); the desktop web dialog needs a registered Facebook app ID
      messenger: () => window.open(`fb-messenger://share/?link=${enc(link())}`, '_blank', 'noopener'),
      telegram: () => window.open(`https://t.me/share/url?url=${enc(link())}&text=${enc(text())}`, '_blank', 'noopener'),
      email: () => { location.href = `mailto:?subject=${enc(text())}&body=${enc(`${text()}\n${link()}`)}` },
    }
  }

  const pairs = []
  for (const button of document.querySelectorAll('[data-share-button]')) {
    const menu = document.getElementById(button.getAttribute('aria-controls') || '')
    if (!menu) continue
    menu.hidden = false // JS is healthy — the class system takes over from [hidden]
    const actions = makeActions(menu)

    const setOpen = (open) => {
      menu.classList.toggle('open', open)
      button.setAttribute('aria-expanded', String(open))
    }

    button.addEventListener('click', () => setOpen(!menu.classList.contains('open')))
    document.addEventListener('click', (e) => {
      if (menu.classList.contains('open') &&
          !menu.contains(e.target) &&
          e.target.closest('[data-share-button]') !== button) setOpen(false)
    })
    for (const [key, fn] of Object.entries(actions)) {
      const b = menu.querySelector(`[data-share="${key}"]`)
      if (!b) continue
      b.addEventListener('click', () => {
        fn()
        if (key !== 'copy') setOpen(false)
      })
    }
    pairs.push({ button, menu, setOpen })
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    for (const { button, menu, setOpen } of pairs) {
      if (menu.classList.contains('open')) { setOpen(false); button.focus() }
    }
  })

  // Floating share — slides in once the hero has scrolled out of view.
  const hero = document.querySelector('.hero')
  const floatWrap = document.querySelector('.float-share')
  if (hero && floatWrap) {
    const update = () => {
      const past = hero.getBoundingClientRect().bottom < window.innerHeight * 0.4
      floatWrap.classList.toggle('show', past)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
  }
}
