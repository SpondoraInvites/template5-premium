// Google Calendar "add event" link builder. Times stay local (calDate + HH:MM)
// and the event zone travels as `ctz`, so Google places the event correctly.

function compactDate(calDate) {
  return calDate.replace(/-/g, '')
}

function compactTime(hhmm) {
  return hhmm.replace(':', '') + '00'
}

export function buildGoogleCalendarUrl({ event, title, location, details = '' }) {
  const day = compactDate(event.calDate)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${day}T${compactTime(event.calStart)}/${day}T${compactTime(event.calEnd)}`,
    location,
    details,
  })
  if (event.calTz) params.set('ctz', event.calTz)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
