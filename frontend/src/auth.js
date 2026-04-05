const AUTH_KEY = 'chaap-wala-admin-auth'
const AUTH_CHANNEL = 'chaap-wala-admin-auth-channel'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const subscribers = new Set()
const browserChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel(AUTH_CHANNEL)
    : null

const notifySubscribers = () => {
  const isLoggedIn = localStorage.getItem(AUTH_KEY) === 'true'
  subscribers.forEach((listener) => listener(isLoggedIn))
}

window.addEventListener('storage', (event) => {
  if (event.key === AUTH_KEY) {
    notifySubscribers()
  }
})

browserChannel?.addEventListener('message', (event) => {
  if (event.data?.type === 'admin-auth-updated') {
    notifySubscribers()
  }
})

export const isAdminLoggedIn = () => localStorage.getItem(AUTH_KEY) === 'true'

export const loginAsAdmin = async (password) => {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL missing. Add Railway backend URL in frontend env.')
  }

  const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  })

  const result = await response.json().catch(() => null)

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || 'Incorrect password. Please try again.')
  }

  localStorage.setItem(AUTH_KEY, 'true')
  notifySubscribers()
  browserChannel?.postMessage({ type: 'admin-auth-updated' })
  return true
}

export const logoutAdmin = () => {
  localStorage.removeItem(AUTH_KEY)
  notifySubscribers()
  browserChannel?.postMessage({ type: 'admin-auth-updated' })
}

export const subscribeAdminAuth = (listener) => {
  subscribers.add(listener)
  return () => subscribers.delete(listener)
}
