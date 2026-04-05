import { isSupabaseConfigured, supabase } from './supabaseClient'

const ADMIN_CONFIG_KEY = 'chaap-wala-admin-configs'
const ADMIN_CONFIG_CHANNEL = 'chaap-wala-admin-configs-channel'
const subscribers = new Set()
let adminConfigsChannel = null
const browserChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel(ADMIN_CONFIG_CHANNEL)
    : null

const getStoredConfigs = () => {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_CONFIG_KEY) || '[]')
  } catch {
    return []
  }
}

const notifySubscribers = (configs) => {
  subscribers.forEach((listener) => listener(configs))
}

const sortConfigs = (configs = []) =>
  [...configs]
    .map((config) => ({
      id: config.id,
      businessType: config.businessType ?? config.business_type ?? '',
      businessName: config.businessName ?? config.business_name ?? '',
      items: Array.isArray(config.items) ? config.items : [],
      updatedAt: config.updatedAt ?? config.updated_at ?? null,
    }))
    .sort((left, right) => left.businessName.localeCompare(right.businessName))

const shouldUseSupabaseAdminConfigs = () => isSupabaseConfigured && supabase

const ensureSupabaseChannel = () => {
  if (!shouldUseSupabaseAdminConfigs() || adminConfigsChannel) {
    return
  }

  adminConfigsChannel = supabase
    .channel('public:business-configs-live')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'business_configs' },
      async () => {
        const configs = await loadAdminConfigs()
        notifySubscribers(configs)
      },
    )
    .subscribe()
}

const teardownSupabaseChannel = () => {
  if (!adminConfigsChannel || !supabase || subscribers.size > 0) {
    return
  }

  supabase.removeChannel(adminConfigsChannel)
  adminConfigsChannel = null
}

const persistConfigs = (configs) => {
  const normalizedConfigs = sortConfigs(configs)
  localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(normalizedConfigs))
  notifySubscribers(normalizedConfigs)
  browserChannel?.postMessage({ type: 'admin-configs-updated' })
}

window.addEventListener('storage', (event) => {
  if (event.key === ADMIN_CONFIG_KEY) {
    notifySubscribers(sortConfigs(getStoredConfigs()))
  }
})

browserChannel?.addEventListener('message', (event) => {
  if (event.data?.type === 'admin-configs-updated') {
    notifySubscribers(sortConfigs(getStoredConfigs()))
  }
})

const createId = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const loadAdminConfigs = async () => {
  if (shouldUseSupabaseAdminConfigs()) {
    const { data, error } = await supabase
      .from('business_configs')
      .select('*')
      .order('business_name', { ascending: true })

    if (error) {
      console.error('Supabase loadAdminConfigs failed:', error)
      return sortConfigs(getStoredConfigs())
    }

    const configs = sortConfigs(data || [])
    localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(configs))
    return configs
  }

  return sortConfigs(getStoredConfigs())
}

export const loadAdminConfig = async (id) => {
  const configs = await loadAdminConfigs()
  if (!id) {
    return configs[0] || null
  }
  return configs.find((config) => config.id === id) || null
}

export const saveAdminConfig = async (config) => {
  const id = config.id || createId(config.businessName)
  const normalizedConfig = {
    id,
    businessType: config.businessType,
    businessName: config.businessName.trim(),
    items: config.items,
  }

  if (shouldUseSupabaseAdminConfigs()) {
    const payload = {
      id,
      business_type: normalizedConfig.businessType,
      business_name: normalizedConfig.businessName,
      items: normalizedConfig.items,
    }

    const { data, error } = await supabase
      .from('business_configs')
      .upsert(payload)
      .select('*')
      .single()

    if (error) {
      console.error('Supabase saveAdminConfig failed:', error)
      return { data: null, error }
    }

    const configs = await loadAdminConfigs()
    notifySubscribers(configs)
    return { data: sortConfigs([data])[0], error: null }
  }

  const configs = getStoredConfigs()

  const existingIndex = configs.findIndex((saved) => saved.id === id)

  if (existingIndex >= 0) {
    configs[existingIndex] = normalizedConfig
  } else {
    configs.push(normalizedConfig)
  }

  persistConfigs(configs)
  return { data: normalizedConfig, error: null }
}

export const deleteAdminConfig = async (id) => {
  if (shouldUseSupabaseAdminConfigs()) {
    const { error } = await supabase.from('business_configs').delete().eq('id', id)
    if (error) {
      console.error('Supabase deleteAdminConfig failed:', error)
      return { data: null, error }
    }

    const configs = await loadAdminConfigs()
    notifySubscribers(configs)
    return { data: null, error: null }
  }

  const configs = getStoredConfigs().filter((config) => config.id !== id)
  persistConfigs(configs)
  return { data: null, error: null }
}

export const clearAdminConfigs = async () => {
  if (shouldUseSupabaseAdminConfigs()) {
    const { error } = await supabase.from('business_configs').delete().neq('id', '')
    if (error) {
      console.error('Supabase clearAdminConfigs failed:', error)
      return { data: null, error }
    }

    localStorage.removeItem(ADMIN_CONFIG_KEY)
    notifySubscribers([])
    browserChannel?.postMessage({ type: 'admin-configs-updated' })
    return { data: null, error: null }
  }

  localStorage.removeItem(ADMIN_CONFIG_KEY)
  notifySubscribers([])
  browserChannel?.postMessage({ type: 'admin-configs-updated' })
  return { data: null, error: null }
}

export const subscribeAdminConfigs = (listener) => {
  subscribers.add(listener)
  ensureSupabaseChannel()

  return () => {
    subscribers.delete(listener)
    teardownSupabaseChannel()
  }
}
