export const STORAGE_KEYS = {
  apiBaseUrl: "ravid.apiBaseUrl",
  token: "ravid.token",
  chatId: "ravid.chatId",
}

export function readStorage(key: string, fallback = "") {
  try {
    return window.localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

export function writeStorage(key: string, value: string) {
  try {
    if (value) {
      window.localStorage.setItem(key, value)
    } else {
      window.localStorage.removeItem(key)
    }
  } catch {
    // Local storage can be disabled in hardened browsers.
  }
}
