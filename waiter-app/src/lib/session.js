import AsyncStorage from '@react-native-async-storage/async-storage'

const WAITER_SESSION_KEY = 'chaap-wala-waiter-session'

export const loadWaiterSession = async () => {
  try {
    const rawValue = await AsyncStorage.getItem(WAITER_SESSION_KEY)
    return rawValue ? JSON.parse(rawValue) : null
  } catch {
    return null
  }
}

export const saveWaiterSession = async (session) => {
  await AsyncStorage.setItem(WAITER_SESSION_KEY, JSON.stringify(session))
}

export const clearWaiterSession = async () => {
  await AsyncStorage.removeItem(WAITER_SESSION_KEY)
}