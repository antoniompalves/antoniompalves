/**
 * Per-browser settings (theme, language, Google Analytics) are saved as
 * "kataru-<name>". The app was called Murmura before, so a setting saved under
 * its old "murmura-<name>" key is still read, and moves over on the next save.
 */
export function loadSetting(name: string): string | null {
  try {
    return localStorage.getItem(`kataru-${name}`) ?? localStorage.getItem(`murmura-${name}`)
  } catch {
    return null
  }
}

/** Saves a setting; without storage (private mode, blocked) it only lasts for this visit. */
export function saveSetting(name: string, value: string) {
  try {
    localStorage.setItem(`kataru-${name}`, value)
    localStorage.removeItem(`murmura-${name}`)
  } catch {
    /* storage unavailable */
  }
}
