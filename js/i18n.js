// Locale application — swaps every visible/control string in place.
// Importantly this never touches animation state: the cover reveal is driven
// by transforms/opacity, so switching language mid-reveal never restarts it.

import { INVITE_CONFIG, INVITE_TRANSLATIONS } from '../config.js'
import { formatEventDate, formatEventTime } from './lib/datetime.js'
import { buildGoogleCalendarUrl } from './lib/calendar.js'

/* Guest-facing languages: English is derived from the config, the rest come
   from INVITE_TRANSLATIONS blocks. */
export const LOCALES = ['en', ...Object.keys(INVITE_TRANSLATIONS)]

/* The flat ui keys index.html renders (data-i18n, data-i18n-alt, …). Content
   is derived from the canonical config; interface strings are fixed English. */
export function enFromConfig(cfg) {
  const [verse, ...rest] = cfg.welcome.inviteLine.split('\n\n')
  const en = {
    'doc.title': `${cfg.couple.name1} & ${cfg.couple.name2} — Wedding Invitation`,

    // Cover
    'cover.familyLine': cfg.welcome.eyebrow,
    'cover.name1': cfg.couple.name1,
    'cover.name2': cfg.couple.name2,
    'cover.and': '&',
    'cover.cue': 'Tap to open the invitation',
    'control.skip': 'Skip',
    'control.skipAria': 'Skip the opening animation',
    'control.replay': 'Replay opening',
    'control.replayAria': 'Replay the opening animation (development mode)',

    // Hero
    'hero.invocation': cfg.blessing,
    'hero.announce': 'Together with their families',
    'hero.invite': 'joyfully invite you to celebrate their wedding',
    'hero.name1': cfg.couple.name1,
    'hero.name2': cfg.couple.name2,
    'hero.parents1': cfg.welcome.parents1,
    'hero.parents2': cfg.welcome.parents2,
    'hero.dateNote': 'Save the date',
    'scroll.cue': 'Scroll',

    // Our story
    'story.heading': 'Our Story',

    // Celebration message
    'message.heading': 'A Celebration of Love',
    'message.p1': verse,
    'message.p2': rest.join('\n\n'),

    // Gallery
    'gallery.heading': 'Moments & Memories',
    'gallery.intro': 'A few glimpses of us and of the details we love.',

    // Lightbox
    'lightbox.close': 'Close',
    'lightbox.prev': 'Previous photo',
    'lightbox.next': 'Next photo',

    // Music
    'audio.play': 'Play background music',
    'audio.pause': 'Pause background music',

    // Details
    'details.heading': 'When & Where',
    'details.dateLabel': 'Date',
    'details.timeLabel': 'Time',
    'details.venueLabel': 'Venue',
    'details.addressLabel': 'Address',
    'details.venueName': cfg.venue.name,
    'details.venueAddress': cfg.venue.address,
    'details.calendarCta': 'Add to Google Calendar',
    'details.eventTitle': cfg.events[0].name,

    // Countdown
    'countdown.heading': 'Counting Down',
    'countdown.fallback': cfg.countdownNote,
    'countdown.days': 'Days',
    'countdown.hours': 'Hours',
    'countdown.minutes': 'Minutes',
    'countdown.seconds': 'Seconds',
    'countdown.aria': 'Countdown to the wedding ceremony',

    // Maps
    'venue.heading': 'Getting There',
    'venue.intro': 'The celebration takes place at the heart of Gulshan, Dhaka.',
    'venue.mapCta': 'Open in Google Maps',
    'venue.mapTitle': 'Map of the venue',

    // Share
    'share.button': 'Share this invitation',
    'share.copy': 'Copy link',
    'share.copied': 'Link copied!',
    'share.whatsapp': 'WhatsApp',
    'share.messenger': 'Messenger',
    'share.telegram': 'Telegram',
    'share.email': 'Email',

    // RSVP
    'rsvp.heading': 'Will You Join Us?',
    'rsvp.deadline': cfg.rsvp.deadline,
    'rsvp.nameLabel': 'Your name',
    'rsvp.namePlaceholder': 'Full name',
    'rsvp.attendLabel': 'Will you attend?',
    'rsvp.accept': 'Joyfully accept',
    'rsvp.decline': 'Regretfully decline',
    'rsvp.guestsLabel': 'Number of guests',
    'rsvp.g1': '1 guest',
    'rsvp.g2': '2 guests',
    'rsvp.g3': '3 guests',
    'rsvp.g4': '4 or more guests',
    'rsvp.noteLabel': 'A note for us (optional)',
    'rsvp.notePlaceholder': 'Wishes, dietary needs, questions…',
    'rsvp.submit': 'Send via WhatsApp',
    'rsvp.errorName': 'Please tell us your name',
    'rsvp.successMessage': 'Thank you — your RSVP has been received.',
    'rsvp.sentMessage': 'WhatsApp opened with your reply — press Send to deliver it.',

    // Closing
    'closing.heading': 'With Heartfelt Gratitude',
    'closing.p1': cfg.closing,
    'closing.signoff': `${cfg.couple.name1} & ${cfg.couple.name2}`,

    // Footer
    'footer.instagram': 'Spondora Invites on Instagram',
    'footer.facebook': 'Spondora Invites on Facebook',
    'footer.made': cfg.credit,
  }
  cfg.story?.chapters?.forEach((chapter, i) => {
    en[`story.m${i + 1}.date`] = chapter.label
    en[`story.m${i + 1}.title`] = chapter.title
    en[`story.m${i + 1}.text`] = chapter.text
  })
  cfg.gallery?.photos?.forEach((photo, i) => {
    en[`gallery.alt${i + 1}`] = photo.alt
  })
  return en
}

const DICTIONARIES = { en: enFromConfig(INVITE_CONFIG), ...INVITE_TRANSLATIONS }

export function translate(key, locale) {
  return DICTIONARIES[locale]?.[key] ?? DICTIONARIES[INVITE_CONFIG.localization.default][key] ?? ''
}

/* Google Maps search + embed URLs, both derived from the one mapQuery. */
export function mapsUrls(mapQuery) {
  const q = encodeURIComponent(mapQuery).replace(/%20/g, '+')
  return {
    search: `https://www.google.com/maps/search/?api=1&query=${q}`,
    embed: `https://www.google.com/maps?q=${q}&output=embed`,
  }
}

export function applyLocale(locale) {
  document.documentElement.lang = locale
  document.title = translate('doc.title', locale)

  // Monogram letters are language-independent.
  const monogram = document.querySelector('.mono-initials')
  if (monogram && INVITE_CONFIG.couple.initials) monogram.textContent = INVITE_CONFIG.couple.initials

  for (const el of document.querySelectorAll('[data-i18n]')) {
    // Only overwrite when a translation exists — the hardcoded HTML text is the
    // fallback (e.g. a visitor's cached config.js predating a new key must
    // never blank a label).
    const text = translate(el.dataset.i18n, locale)
    if (text) el.textContent = text
  }
  for (const el of document.querySelectorAll('[data-i18n-aria]')) {
    const label = translate(el.dataset.i18nAria, locale)
    if (label) el.setAttribute('aria-label', label)
  }
  for (const el of document.querySelectorAll('[data-i18n-alt]')) {
    const alt = translate(el.dataset.i18nAlt, locale)
    if (alt) el.setAttribute('alt', alt)
  }
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
    const ph = translate(el.dataset.i18nPlaceholder, locale)
    if (ph) el.setAttribute('placeholder', ph)
  }
  for (const el of document.querySelectorAll('[data-i18n-title]')) {
    const title = translate(el.dataset.i18nTitle, locale)
    if (title) el.setAttribute('title', title)
  }
  const maps = mapsUrls(INVITE_CONFIG.venue.mapQuery)
  for (const el of document.querySelectorAll('[data-map-embed]')) {
    el.src = maps.embed
  }
  const event = INVITE_CONFIG.events[0]
  for (const el of document.querySelectorAll('[data-i18n-date]')) {
    el.textContent = formatEventDate(INVITE_CONFIG.weddingDateTime, event.calTz, locale)
  }
  for (const el of document.querySelectorAll('[data-i18n-time]')) {
    el.textContent = formatEventTime(INVITE_CONFIG.weddingDateTime, event.calTz, locale)
  }
  const calTitle = translate('details.eventTitle', locale)
  const location = `${translate('details.venueName', locale)}, ${translate('details.venueAddress', locale)}`
  for (const a of document.querySelectorAll('[data-href="calendar"]')) {
    a.href = buildGoogleCalendarUrl({
      event: { iso: event.calStart, endIso: event.calEnd },
      title: calTitle,
      location,
    })
  }
  for (const a of document.querySelectorAll('[data-href="maps"]')) {
    a.href = maps.search
  }
  for (const btn of document.querySelectorAll('[data-locale-btn]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.localeBtn === locale))
  }
  // Let live widgets (countdown digits, scroll triggers) re-render in place.
  document.dispatchEvent(new CustomEvent('invitation:locale', { detail: locale }))
}
