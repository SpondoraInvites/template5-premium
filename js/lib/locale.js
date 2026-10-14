// Locale resolution + persistence with injectable storage (testable, fail-safe).

const STORAGE_KEY = 'locale'

export function resolveLocale({ urlParam, stored, supported, fallback }) {
  const pick = (value) => {
    const code = (value ?? '').toString().toLowerCase()
    return supported.includes(code) ? code : null
  }
  return pick(urlParam) ?? pick(stored) ?? fallback
}

export function readStoredLocale(storage) {
  try {
    return storage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function persistLocale(storage, locale) {
  try {
    storage.setItem(STORAGE_KEY, locale)
  } catch {
    // storage unavailable (private mode etc.) — preference simply not persisted
  }
}
