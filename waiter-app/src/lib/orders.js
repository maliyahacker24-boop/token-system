const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
const ORDER_POLL_INTERVAL_MS = 5000

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const configurationError = isSupabaseConfigured
  ? ''
  : 'Supabase keys missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in waiter-app/.env.'

const buildHeaders = (extraHeaders = {}) => ({
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${supabaseAnonKey}`,
  ...extraHeaders,
})

const parseErrorResponse = async (response, fallbackMessage) => {
  try {
    const data = await response.json()
    return data?.message || data?.error || fallbackMessage
  } catch {
    return fallbackMessage
  }
}

const request = async (path, options = {}) => {
  const response = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    ...options,
    headers: buildHeaders(options.headers),
  })

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Supabase request failed.')
    throw new Error(message)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
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

export const calculateTotalPrice = (items = []) =>
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
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())

const ensureConfigured = () => {
  if (!isSupabaseConfigured) {
    throw new Error(configurationError)
  }
}

export const loadOrders = async () => {
  ensureConfigured()
  const data = await request('/orders?select=*&order=created_at.desc')
  return sortOrders(data || [])
}

const loadOrderById = async (orderId) => {
  ensureConfigured()
  const encodedOrderId = encodeURIComponent(orderId)
  const data = await request(`/orders?select=*&id=eq.${encodedOrderId}&limit=1`)
  return sortOrders(data || [])[0] || null
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

export const addItemsToOrder = async (orderId, additionalItems) => {
  ensureConfigured()
  const order = await loadOrderById(orderId)

  if (!order) {
    throw new Error('Order not found.')
  }

  const nextItems = mergeOrderItems(order.items, additionalItems)
  const nextStatus = order.status === 'ready' ? 'preparing' : order.status

  const encodedOrderId = encodeURIComponent(orderId)
  const data = await request(`/orders?id=eq.${encodedOrderId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      items: nextItems,
      total_price: calculateTotalPrice(nextItems),
      status: nextStatus,
    }),
  })

  return sortOrders(data || [])[0] || null
}

export const subscribeOrders = (listener) => {
  if (!isSupabaseConfigured) {
    return () => {}
  }

  let isActive = true

  const emitLatest = async () => {
    try {
      const orders = await loadOrders()
      if (isActive) {
        listener(orders)
      }
    } catch (error) {
      console.error('Waiter order polling failed:', error)
      return undefined
    }

    return undefined
  }

  const pollTimer = setInterval(() => {
    emitLatest()
  }, ORDER_POLL_INTERVAL_MS)

  return () => {
    isActive = false
    clearInterval(pollTimer)
  }
}