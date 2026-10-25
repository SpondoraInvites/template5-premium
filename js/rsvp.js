// RSVP delivery uses the configured endpoint when available, with WhatsApp
// as the fallback. Name is the only required field.

import { config } from './config.js'
import { translate } from './i18n.js'

export function initRsvp() {
  const form = document.getElementById('rsvp-form')
  if (!form) return
  const nameInput = form.elements.name
  const guests = form.elements.guests
  const note = form.elements.note
  const error = form.querySelector('[data-rsvp-error]')
  const confirmation = document.getElementById('rsvp-done')

  const finish = (message) => {
    form.hidden = true
    confirmation.textContent = message
    confirmation.hidden = false
  }

  const compose = async () => {
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

    const openWhatsApp = () => {
      window.open(`https://wa.me/${config.rsvp.whatsapp}?text=${encodeURIComponent(body)}`, '_blank', 'noopener')
    }

    if (config.rsvp.endpoint) {
      try {
        const response = await fetch(config.rsvp.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            couple: translate('details.eventTitle', locale),
            name,
            attending: form.elements.attend.value,
            guests: accept ? guests.value : '',
            note: noteText,
          }),
        })
        if (!response.ok) throw new Error(`RSVP endpoint returned ${response.status}`)
        finish(translate('rsvp.successMessage', locale))
      } catch {
        openWhatsApp()
        finish(translate('rsvp.sentMessage', locale))
      }
    } else {
      openWhatsApp()
      finish(translate('rsvp.sentMessage', locale))
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    return compose()
  })
}
