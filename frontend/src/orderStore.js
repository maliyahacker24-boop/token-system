import { supabase, isSupabaseConfigured } from './supabaseClient'

const ORDER_STORAGE_KEY = 'chaap-wala-orders'
const ORDER_CHANNEL_NAME = 'chaap-wala-orders-channel'
const ORDER_RUNTIME_KEY = 'chaap-wala-orders-runtime'
const ORDER_POLL_INTERVAL_MS = 5000
const subscribers = new Set()
let ordersChannel = null
let ordersPollTimer = null
let lastOrdersSnapshot = '[]'
let forceLocalMode = false
const browserChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel(ORDER_CHANNEL_NAME)
    : null

const getStoredOrders = () => {
  try {
    return JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

const getRuntimeState = () => {
  try {
    return JSON.parse(localStorage.getItem(ORDER_RUNTIME_KEY) || '{}')
  } catch {
    return {}
  }
}

const persistRuntimeState = (state) => {
  localStorage.setItem(ORDER_RUNTIME_KEY, JSON.stringify(state))
}

const normalizeItems = (items = []) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    price: Number(item.price) || 0,
    quantity: Number(item.quantity) || 0,
  }))

const normalizeServiceType = (value) => {
  const normalized = `${value || ''}`.trim().toLowerCase().replace(/[\s_-]+/g, ' ')

  if (normalized === 'take away' || normalized === 'takeaway') {
    return 'Take Away'
  }

  if (normalized === 'dine in' || normalized === 'dinein') {
    return 'Dine In'
  }

  return `${value || ''}`.trim()
}

const normalizeStatus = (value) => `${value || ''}`.trim().toLowerCase()

const calculateTotalPrice = (items = []) =>
  normalizeItems(items).reduce((sum, item) => sum + item.price * item.quantity, 0)

const sortOrders = (orders = []) =>
  [...orders]
    .map((order) => {
      const items = normalizeItems(order.items)
      const totalPrice = Number(order.total_price)

      return {
        ...order,
        businessId: order.businessId ?? order.businessid ?? '',
        businessName: order.businessName ?? order.businessname ?? '',
        serviceType: normalizeServiceType(order.serviceType ?? order.servicetype),
        paymentMethod: `${order.paymentMethod ?? order.paymentmethod ?? ''}`.trim(),
        orderSource: `${order.orderSource ?? order.ordersource ?? ''}`.trim(),
        status: normalizeStatus(order.status),
        token_number: Number(order.token_number) || 0,
        items,
        total_price: Number.isFinite(totalPrice) ? totalPrice : calculateTotalPrice(items),
        created_at: order.created_at || new Date().toISOString(),
      }
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

const syncLatestSnapshot = (orders = []) => {
  lastOrdersSnapshot = JSON.stringify(sortOrders(orders))
}

const notifySubscribers = (orders) => {
  subscribers.forEach((listener) => listener(orders))
}

const broadcastOrders = () => {
  browserChannel?.postMessage({ type: 'orders-updated' })
}

const shouldUseSupabaseOrders = () => isSupabaseConfigured && supabase && !forceLocalMode

const enableLocalMode = (reason) => {
  if (forceLocalMode) {
    return
  }

  forceLocalMode = true
  persistRuntimeState({ forceLocalMode: true, reason })
  teardownSupabaseChannel()
  browserChannel?.postMessage({ type: 'orders-local-mode-enabled', reason })
}

const syncRuntimeFromStorage = () => {
  const runtimeState = getRuntimeState()
  forceLocalMode = Boolean(runtimeState.forceLocalMode)
  if (forceLocalMode) {
    teardownSupabaseChannel()
  }
}

const emitLatestOrders = async () => {
  const orders = await loadOrders()
  syncLatestSnapshot(orders)
  notifySubscribers(orders)
  return orders
}

const mergeOrderItems = (currentItems = [], additionalItems = []) => {
  const mergedItems = [...normalizeItems(currentItems)]

  normalizeItems(additionalItems).forEach((nextItem) => {
    const existingIndex = mergedItems.findIndex(
      (item) => item.id === nextItem.id || item.name === nextItem.name,
    )

    if (existingIndex >= 0) {
      const existingItem = mergedItems[existingIndex]
      mergedItems[existingIndex] = {
        ...existingItem,
        quantity: existingItem.quantity + nextItem.quantity,
        price: nextItem.price || existingItem.price,
      }
      return
    }

    mergedItems.push(nextItem)
  })

  return mergedItems.filter((item) => item.quantity > 0)
}

const loadOrderById = async (orderId) => {
  if (shouldUseSupabaseOrders()) {
    const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).single()
    if (error) {
      console.error('Supabase loadOrderById failed:', error)
      enableLocalMode('loadOrderById failed')
      const order = getStoredOrders().find((item) => item.id === orderId) || null
      return { data: order, error: null }
    }
    return { data, error: null }
  }

  const order = getStoredOrders().find((item) => item.id === orderId) || null
  return { data: order, error: null }
}

const ensureSupabaseChannel = () => {
  if (!shouldUseSupabaseOrders() || ordersChannel) {
    return
  }

  ordersChannel = supabase
    .channel('public:orders-live')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      async () => {
        await emitLatestOrders()
      },
    )
    .subscribe()
}

const teardownSupabaseChannel = () => {
  if (!ordersChannel || !supabase || subscribers.size > 0) {
    return
  }

  supabase.removeChannel(ordersChannel)
  ordersChannel = null
}

const ensureOrdersPolling = () => {
  if (ordersPollTimer || typeof window === 'undefined') {
    return
  }

  ordersPollTimer = window.setInterval(async () => {
    if (subscribers.size === 0) {
      window.clearInterval(ordersPollTimer)
      ordersPollTimer = null
      return
    }

    const orders = await loadOrders()
    const nextSnapshot = JSON.stringify(orders)

    if (nextSnapshot !== lastOrdersSnapshot) {
      lastOrdersSnapshot = nextSnapshot
      notifySubscribers(orders)
    }
  }, ORDER_POLL_INTERVAL_MS)
}

const teardownOrdersPolling = () => {
  if (!ordersPollTimer || typeof window === 'undefined' || subscribers.size > 0) {
    return
  }

  window.clearInterval(ordersPollTimer)
  ordersPollTimer = null
}

const persistOrders = (orders) => {
  const normalizedOrders = sortOrders(orders)
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(normalizedOrders))
  syncLatestSnapshot(normalizedOrders)
  notifySubscribers(normalizedOrders)
  broadcastOrders()
}

window.addEventListener('storage', (event) => {
  if (event.key === ORDER_STORAGE_KEY) {
    const orders = sortOrders(getStoredOrders())
    syncLatestSnapshot(orders)
    subscribers.forEach((listener) => listener(orders))
  }

  if (event.key === ORDER_RUNTIME_KEY) {
    syncRuntimeFromStorage()
  }
})

browserChannel?.addEventListener('message', (event) => {
  if (event.data?.type === 'orders-updated') {
    const orders = sortOrders(getStoredOrders())
    syncLatestSnapshot(orders)
    notifySubscribers(orders)
  }

  if (event.data?.type === 'orders-local-mode-enabled') {
    forceLocalMode = true
    teardownSupabaseChannel()
  }
})

syncRuntimeFromStorage()

export const loadOrders = async () => {
  if (shouldUseSupabaseOrders()) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase loadOrders failed:', error)
      enableLocalMode('loadOrders failed')
      return sortOrders(getStoredOrders())
    }

    return sortOrders(data || [])
  }

  return sortOrders(getStoredOrders())
}

export const getLatestOrder = async () => {
  if (shouldUseSupabaseOrders()) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('token_number', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Supabase getLatestOrder failed:', error)
      enableLocalMode('getLatestOrder failed')
      const orders = getStoredOrders()
      const latest = [...orders].sort((a, b) => b.token_number - a.token_number)[0]
      return { data: latest ? [latest] : [] }
    }

    return { data: sortOrders(data || []).sort((a, b) => b.token_number - a.token_number).slice(0, 1) }
  }

  const orders = getStoredOrders()
  const latest = [...orders].sort((a, b) => b.token_number - a.token_number)[0]
  return { data: latest ? [latest] : [] }
}

export const saveOrder = async (order) => {
  const normalizedOrder = sortOrders([order])[0]

  if (shouldUseSupabaseOrders()) {
    const { data, error } = await supabase.from('orders').insert(normalizedOrder).select().single()
    if (error) {
      console.error('Supabase saveOrder failed:', error)
      enableLocalMode('saveOrder failed')
      const orders = getStoredOrders()
      persistOrders([...orders, normalizedOrder])
      return { data: normalizedOrder, error: null }
    }
    await emitLatestOrders()
    return { data: sortOrders([data])[0], error: null }
  }

  const orders = getStoredOrders()
  persistOrders([...orders, normalizedOrder])
  return { data: normalizedOrder, error: null }
}

export const updateOrderStatus = async (orderId, nextStatus) => {
  return updateOrder(orderId, { status: nextStatus })
}

export const updateOrder = async (orderId, patch) => {
  if (shouldUseSupabaseOrders()) {
    const { data, error } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', orderId)
      .select('*')
      .single()

    if (error) {
      console.error('Supabase updateOrder failed:', error)
      enableLocalMode('updateOrder failed')
      const orders = getStoredOrders()
      const updatedOrders = orders.map((order) =>
        order.id === orderId ? { ...order, ...patch } : order,
      )
      persistOrders(updatedOrders)
      return {
        data: updatedOrders.find((order) => order.id === orderId) || null,
        error: null,
      }
    }

    await emitLatestOrders()
    return { data, error: null }
  }

  const orders = getStoredOrders()
  const updatedOrders = orders.map((order) =>
    order.id === orderId ? { ...order, ...patch } : order,
  )
  persistOrders(updatedOrders)
  return {
    data: updatedOrders.find((order) => order.id === orderId) || null,
    error: null,
  }
}

export const addItemsToOrder = async (orderId, additionalItems) => {
  const { data: order, error } = await loadOrderById(orderId)

  if (error) {
    return { data: null, error }
  }

  if (!order) {
    return { data: null, error: new Error('Order not found.') }
  }

  const nextItems = mergeOrderItems(order.items, additionalItems)
  const nextStatus = order.status === 'ready' ? 'preparing' : order.status

  return updateOrder(orderId, {
    items: nextItems,
    total_price: calculateTotalPrice(nextItems),
    status: nextStatus,
  })
}

export const subscribeOrders = (listener) => {
  subscribers.add(listener)
  ensureOrdersPolling()

  if (shouldUseSupabaseOrders()) {
    ensureSupabaseChannel()
  }

  return () => {
    subscribers.delete(listener)
    teardownSupabaseChannel()
    teardownOrdersPolling()
  }
}

export { calculateTotalPrice }
