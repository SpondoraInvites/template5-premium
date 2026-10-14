// Google Calendar "add event" link builder (all times converted to UTC).

function utcCompact(iso) {
  return new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '')
}

export function buildGoogleCalendarUrl({ event, title, location, details = '' }) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${utcCompact(event.iso)}/${utcCompact(event.endIso)}`,
    location,
    details,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
