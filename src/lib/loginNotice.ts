// One-shot message for the login screen, for when the session ends on purpose and the user
// lands on /login without a chance to see a message first (e.g. after changing the password,
// which revokes every session). Lives in sessionStorage so it survives the redirect only.
const KEY = 'login_notice'

export function setLoginNotice(message: string) {
  try {
    sessionStorage.setItem(KEY, message)
  } catch {
    // Storage unavailable: the user simply won't see the notice.
  }
}

export function consumeLoginNotice(): string | null {
  try {
    const message = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return message
  } catch {
    return null
  }
}
