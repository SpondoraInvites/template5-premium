// RSVP form — static-site pattern: no backend. Submitting composes a
// pre-filled WhatsApp reply (config.rsvp.whatsapp); the email link is the
// fallback channel. Name is the only required field.

import { config } from './config.js'
import { translate } from './i18n.js'

export function initRsvp() {
  const form = document.getElementById('rsvp-form')
  if (!form) return
  const nameInput = form.elements.name
  const guests = form.elements.guests
  const note = form.elements.note
  const error = form.querySelector('[data-rsvp-error]')
  const emailLink = form.querySelector('[data-rsvp-email]')

  const compose = (channel) => {
    const name = nameInput.value.trim()
    if (!name) {
      error.hidden = false
      nameInput.focus()
      return
    }
    error.hidden = true
    const locale = document.documentElement.lang || config.defaultLocale
    const accept = form.elements.attend.value === 'accept'
    const lines = [
      `${translate('details.eventTitle', locale)} — RSVP`,
      `${translate('rsvp.nameLabel', locale)}: ${name}`,
      `${translate('rsvp.attendLabel', locale)}: ${translate(accept ? 'rsvp.accept' : 'rsvp.decline', locale)}`,
    ]
    if (accept) {
      lines.push(`${translate('rsvp.guestsLabel', locale)}: ${guests.options[guests.selectedIndex].text}`)
    }
    const noteText = note.value.trim()
    if (noteText) lines.push('', noteText)
    const body = lines.join('\n')

    if (channel === 'email') {
      location.href = `mailto:${config.rsvp.email}?subject=${encodeURIComponent(lines[0])}&body=${encodeURIComponent(body)}`
    } else {
      window.open(`https://wa.me/${config.rsvp.whatsapp}?text=${encodeURIComponent(body)}`, '_blank', 'noopener')
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    compose('whatsapp')
  })
  emailLink.addEventListener('click', (e) => {
    e.preventDefault()
    compose('email')
  })
}
