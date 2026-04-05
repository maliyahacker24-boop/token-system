import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

const STATUS_THEME = {
  received: { bg: '#e0f2fe', text: '#075985' },
  preparing: { bg: '#ffedd5', text: '#c2410c' },
  ready: { bg: '#dcfce7', text: '#166534' },
  waste: { bg: '#fee2e2', text: '#b91c1c' },
}

const formatMoney = (value) => `Rs ${Number(value || 0)}`

const normalizeText = (value) => `${value || ''}`.trim().toLowerCase()

const createItemId = (name) =>
  `${name || 'item'}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `item-${Date.now()}`

const mergeAddonItems = (currentItems = [], nextItem) => {
  const existingIndex = currentItems.findIndex(
    (item) => item.id === nextItem.id || normalizeText(item.name) === normalizeText(nextItem.name),
  )

  if (existingIndex === -1) {
    return [...currentItems, nextItem]
  }

  return currentItems.map((item, index) =>
    index === existingIndex
      ? {
          ...item,
          quantity: item.quantity + nextItem.quantity,
          price: nextItem.price || item.price,
        }
      : item,
  )
}

const getQuickAddItems = (order) => {
  const itemMap = new Map()

  ;(order?.items || []).forEach((item) => {
    const itemName = `${item?.name || ''}`.trim()
    if (!itemName) {
      return
    }

    const itemId = item.id || createItemId(itemName)
    if (!itemMap.has(itemId)) {
      itemMap.set(itemId, {
        id: itemId,
        name: itemName,
        price: Number(item.price) || 0,
      })
    }
  })

  return [...itemMap.values()]
}

export default function WaiterDesk({ session, onLogout }) {
  const [ordersModule, setOrdersModule] = useState(null)
  const unsubscribeRef = useRef(() => {})

  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [liveConnected, setLiveConnected] = useState(false)
  const [screenError, setScreenError] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [addonItems, setAddonItems] = useState([])
  const [manualName, setManualName] = useState('')
  const [manualPrice, setManualPrice] = useState('')
  const [manualQty, setManualQty] = useState('1')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    return () => {
      unsubscribeRef.current()
    }
  }, [])

  const connectOrders = async () => {
    if (isConnecting) {
      return
    }

    setIsConnecting(true)
    setLoadingOrders(true)
    setScreenError('')
    setMessage('')

    try {
      let nextOrdersModule = ordersModule

      if (!nextOrdersModule) {
        nextOrdersModule = await import('./lib/orders')
        setOrdersModule(nextOrdersModule)
      }

      if (!nextOrdersModule.isSupabaseConfigured) {
        throw new Error(nextOrdersModule.configurationError)
      }

      const nextOrders = await nextOrdersModule.loadOrders()
      setOrders(nextOrders)
      setLiveConnected(true)

      unsubscribeRef.current()
      unsubscribeRef.current = nextOrdersModule.subscribeOrders((incomingOrders) => {
        setOrders(incomingOrders)
      })
    } catch (error) {
      unsubscribeRef.current()
      unsubscribeRef.current = () => {}
      setLiveConnected(false)
      setScreenError(error?.message || 'Orders load nahi ho paye.')
    } finally {
      setLoadingOrders(false)
      setIsConnecting(false)
    }
  }

  const activeOrders = useMemo(() => {
    const tokenQuery = searchQuery.trim()

    return orders
      .filter((order) => order.serviceType === 'Dine In' && order.status !== 'waste')
      .filter((order) => (tokenQuery ? `${order.token_number}`.includes(tokenQuery) : true))
      .sort((left, right) => right.token_number - left.token_number)
  }, [orders, searchQuery])

  useEffect(() => {
    if (!activeOrders.length) {
      setSelectedOrderId('')
      return
    }

    const orderStillVisible = activeOrders.some((order) => order.id === selectedOrderId)
    if (!orderStillVisible) {
      setSelectedOrderId(activeOrders[0].id)
    }
  }, [activeOrders, selectedOrderId])

  const selectedOrder = useMemo(
    () => activeOrders.find((order) => order.id === selectedOrderId) || null,
    [activeOrders, selectedOrderId],
  )

  const quickAddItems = useMemo(() => getQuickAddItems(selectedOrder), [selectedOrder])

  const addonTotal = useMemo(
    () => addonItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [addonItems],
  )

  const summary = useMemo(
    () => ({
      total: activeOrders.length,
      preparing: activeOrders.filter((order) => order.status === 'preparing').length,
      ready: activeOrders.filter((order) => order.status === 'ready').length,
    }),
    [activeOrders],
  )

  const addQuickItem = (item) => {
    setMessage('')
    setScreenError('')
    setAddonItems((currentItems) =>
      mergeAddonItems(currentItems, {
        id: item.id || createItemId(item.name),
        name: item.name,
        price: Number(item.price) || 0,
        quantity: 1,
      }),
    )
  }

  const changeAddonQty = (itemId, delta) => {
    setAddonItems((currentItems) =>
      currentItems
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: Math.max(Number(item.quantity || 0) + delta, 0) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const handleAddManualItem = () => {
    const nextName = manualName.trim()
    const nextPrice = Number(manualPrice)
    const nextQty = Math.max(Number(manualQty) || 1, 1)

    if (!nextName) {
      setScreenError('Manual item ka naam likho.')
      return
    }

    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      setScreenError('Manual item ka valid price likho.')
      return
    }

    setAddonItems((currentItems) =>
      mergeAddonItems(currentItems, {
        id: createItemId(nextName),
        name: nextName,
        price: nextPrice,
        quantity: nextQty,
      }),
    )
    setScreenError('')
    setMessage('')
    setManualName('')
    setManualPrice('')
    setManualQty('1')
  }

  const handleSubmitAddons = async () => {
    if (!selectedOrder) {
      setScreenError('Pehle ek token select karo.')
      return
    }

    if (!ordersModule?.addItemsToOrder) {
      setScreenError('Live orders connect karo, phir update karo.')
      return
    }

    if (addonItems.length === 0) {
      setScreenError('Kam se kam ek item add karo.')
      return
    }

    setIsSaving(true)
    setScreenError('')
    setMessage('')

    try {
      await ordersModule.addItemsToOrder(selectedOrder.id, addonItems)
      const refreshedOrders = await ordersModule.loadOrders()
      setOrders(refreshedOrders)
      setAddonItems([])
      setManualName('')
      setManualPrice('')
      setManualQty('1')
      setMessage(`Token #${selectedOrder.token_number} update ho gaya.`)
    } catch (error) {
      setScreenError(error?.message || 'Add-on update nahi ho paya.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoutPress = () => {
    unsubscribeRef.current()
    unsubscribeRef.current = () => {}
    onLogout()
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerCard}>
          <View style={styles.headerCopyWrap}>
            <Text style={styles.eyebrow}>LIVE WAITER DESK</Text>
            <Text style={styles.headerTitle}>Namaste, {session.waiterName}</Text>
            <Text style={styles.headerCopy}>
              Orders ab app launch par nahi, sirf connect button ke baad load honge.
            </Text>
          </View>
          <Pressable onPress={handleLogoutPress} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.connectionCard}>
          <Text style={styles.connectionTitle}>Live Orders</Text>
          <Text style={styles.connectionCopy}>
            Agar app ab stable khul rahi hai, neeche se live Supabase sync manually connect karo.
          </Text>
          <Pressable onPress={connectOrders} style={styles.connectButton} disabled={isConnecting}>
            {isConnecting ? (
              <ActivityIndicator color="#052e16" />
            ) : (
              <Text style={styles.connectButtonText}>{liveConnected ? 'Refresh Orders' : 'Connect Live Orders'}</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryCardDark]}>
            <Text style={styles.summaryLabelDark}>Active Orders</Text>
            <Text style={styles.summaryValueDark}>{summary.total}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Preparing</Text>
            <Text style={[styles.summaryValue, styles.preparingValue]}>{summary.preparing}</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardLast]}>
            <Text style={styles.summaryLabel}>Ready</Text>
            <Text style={[styles.summaryValue, styles.readyValue]}>{summary.ready}</Text>
          </View>
        </View>

        <TextInput
          value={searchQuery}
          onChangeText={(value) => setSearchQuery(value.replace(/[^0-9]/g, ''))}
          placeholder="Search token number"
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
        />

        {message ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{message}</Text>
          </View>
        ) : null}

        {screenError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{screenError}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Open Dine-In Orders</Text>

          {!liveConnected ? (
            <View style={styles.centerState}>
              <Text style={styles.centerStateText}>Pehle live orders connect karo.</Text>
            </View>
          ) : loadingOrders ? (
            <View style={styles.centerState}>
              <ActivityIndicator color="#f59e0b" />
              <Text style={styles.centerStateText}>Orders load ho rahe hain...</Text>
            </View>
          ) : activeOrders.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.centerStateText}>Abhi koi active dine-in token nahi mila.</Text>
            </View>
          ) : (
            activeOrders.map((order) => {
              const statusTheme = STATUS_THEME[order.status] || STATUS_THEME.received
              const isSelected = selectedOrderId === order.id

              return (
                <Pressable
                  key={order.id}
                  onPress={() => setSelectedOrderId(order.id)}
                  style={[styles.orderCard, isSelected && styles.orderCardSelected]}
                >
                  <View style={styles.orderTopRow}>
                    <View>
                      <Text style={[styles.orderBusiness, isSelected && styles.orderBusinessSelected]}>
                        {order.businessName || 'Chaap Wala'}
                      </Text>
                      <Text style={[styles.orderToken, isSelected && styles.orderTokenSelected]}>
                        Token #{order.token_number}
                      </Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: statusTheme.bg }]}>
                      <Text style={[styles.statusChipText, { color: statusTheme.text }]}>{order.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.orderMeta, isSelected && styles.orderMetaSelected]}>
                    {(order.items || []).map((item) => `${item.name} x${item.quantity}`).join(', ')}
                  </Text>
                </Pressable>
              )
            })
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Selected Order</Text>

          {!selectedOrder ? (
            <View style={styles.centerState}>
              <Text style={styles.centerStateText}>Kisi token ko select karo.</Text>
            </View>
          ) : (
            <>
              <View style={styles.selectedHeader}>
                <View style={styles.selectedHeaderCopy}>
                  <Text style={styles.selectedToken}>Token #{selectedOrder.token_number}</Text>
                  <Text style={styles.selectedSubtext}>
                    {selectedOrder.businessName || 'Chaap Wala'} | {selectedOrder.serviceType}
                  </Text>
                </View>
                <Text style={styles.selectedAmount}>{formatMoney(selectedOrder.total_price)}</Text>
              </View>

              <Text style={styles.blockLabel}>Current Items</Text>
              <View style={styles.wrapRow}>
                {(selectedOrder.items || []).map((item, index) => (
                  <View key={`${item.id || item.name}-${index}`} style={styles.itemChip}>
                    <Text style={styles.itemChipText}>{item.name} x{item.quantity}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.blockLabel}>Quick Add</Text>
              {quickAddItems.length === 0 ? (
                <Text style={styles.helperText}>Is token mein abhi koi item nahi hai. Neeche manual item add karo.</Text>
              ) : (
                quickAddItems.map((item) => (
                  <Pressable key={item.id} onPress={() => addQuickItem(item)} style={styles.quickAddCard}>
                    <Text style={styles.quickAddName}>{item.name}</Text>
                    <Text style={styles.quickAddPrice}>{formatMoney(item.price)}</Text>
                  </Pressable>
                ))
              )}

              <Text style={styles.blockLabel}>Manual Item Add</Text>
              <TextInput
                value={manualName}
                onChangeText={setManualName}
                placeholder="Item name"
                placeholderTextColor="#94a3b8"
                style={styles.input}
              />
              <View style={styles.manualRow}>
                <TextInput
                  value={manualPrice}
                  onChangeText={(value) => setManualPrice(value.replace(/[^0-9]/g, ''))}
                  placeholder="Price"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  style={[styles.input, styles.manualInput, styles.manualInputSpacing]}
                />
                <TextInput
                  value={manualQty}
                  onChangeText={(value) => setManualQty(value.replace(/[^0-9]/g, '') || '1')}
                  placeholder="Qty"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  style={[styles.input, styles.manualInput]}
                />
              </View>
              <Pressable onPress={handleAddManualItem} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Add Manual Item</Text>
              </Pressable>

              <Text style={styles.blockLabel}>Add-on Cart</Text>
              {addonItems.length === 0 ? (
                <Text style={styles.helperText}>Abhi koi extra item select nahi hua.</Text>
              ) : (
                addonItems.map((item) => (
                  <View key={item.id} style={styles.addonRow}>
                    <View style={styles.addonInfo}>
                      <Text style={styles.addonName}>{item.name}</Text>
                      <Text style={styles.addonPrice}>{formatMoney(item.price)}</Text>
                    </View>
                    <View style={styles.qtyControls}>
                      <Pressable onPress={() => changeAddonQty(item.id, -1)} style={styles.qtyButton}>
                        <Text style={styles.qtyButtonText}>-</Text>
                      </Pressable>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <Pressable onPress={() => changeAddonQty(item.id, 1)} style={styles.qtyButtonDark}>
                        <Text style={styles.qtyButtonTextDark}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}

              <View style={styles.checkoutCard}>
                <Text style={styles.checkoutLabel}>Add-on Total</Text>
                <Text style={styles.checkoutAmount}>{formatMoney(addonTotal)}</Text>
                <Pressable
                  onPress={handleSubmitAddons}
                  disabled={isSaving || addonItems.length === 0}
                  style={[styles.connectButton, (isSaving || addonItems.length === 0) && styles.disabledButton]}
                >
                  <Text style={styles.connectButtonText}>{isSaving ? 'Saving...' : 'Update Token'}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  headerCard: {
    borderRadius: 28,
    backgroundColor: '#0f172a',
    padding: 20,
    marginBottom: 16,
  },
  headerCopyWrap: {
    marginBottom: 12,
  },
  eyebrow: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerTitle: {
    marginTop: 8,
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  headerCopy: {
    marginTop: 10,
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  logoutButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logoutButtonText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 13,
  },
  connectionCard: {
    borderRadius: 24,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 18,
    marginBottom: 16,
  },
  connectionTitle: {
    color: '#9a3412',
    fontSize: 22,
    fontWeight: '900',
  },
  connectionCopy: {
    marginTop: 10,
    color: '#9a3412',
    fontSize: 14,
    lineHeight: 20,
  },
  connectButton: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: '#34d399',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  connectButtonText: {
    color: '#052e16',
    fontSize: 15,
    fontWeight: '900',
  },
  disabledButton: {
    backgroundColor: '#a7f3d0',
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 10,
  },
  summaryCardDark: {
    backgroundColor: '#111827',
  },
  summaryCardLast: {
    marginRight: 0,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '900',
  },
  preparingValue: {
    color: '#c2410c',
  },
  readyValue: {
    color: '#166534',
  },
  summaryLabelDark: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValueDark: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
  },
  searchInput: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#0f172a',
    fontSize: 15,
    marginBottom: 16,
  },
  successBox: {
    borderRadius: 18,
    backgroundColor: '#ecfdf5',
    padding: 14,
    marginBottom: 16,
  },
  successText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBox: {
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 28,
    backgroundColor: '#ffffff',
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 14,
  },
  centerState: {
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerStateText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  orderCard: {
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderCardSelected: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderBusiness: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  orderBusinessSelected: {
    color: '#94a3b8',
  },
  orderToken: {
    marginTop: 6,
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '900',
  },
  orderTokenSelected: {
    color: '#ffffff',
  },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  orderMeta: {
    marginTop: 12,
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  orderMetaSelected: {
    color: '#cbd5e1',
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedHeaderCopy: {
    flex: 1,
    marginRight: 12,
  },
  selectedToken: {
    color: '#0f172a',
    fontSize: 30,
    fontWeight: '900',
  },
  selectedSubtext: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 14,
  },
  selectedAmount: {
    color: '#166534',
    fontSize: 20,
    fontWeight: '900',
  },
  blockLabel: {
    marginTop: 18,
    marginBottom: 10,
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemChip: {
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  itemChipText: {
    color: '#334155',
    fontWeight: '700',
  },
  helperText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  quickAddCard: {
    borderRadius: 20,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 16,
    marginBottom: 10,
  },
  quickAddName: {
    color: '#7c2d12',
    fontSize: 16,
    fontWeight: '800',
  },
  quickAddPrice: {
    marginTop: 6,
    color: '#c2410c',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0f172a',
    marginBottom: 10,
  },
  manualRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  manualInput: {
    flex: 1,
  },
  manualInputSpacing: {
    marginRight: 10,
  },
  secondaryButton: {
    borderRadius: 16,
    backgroundColor: '#0f172a',
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  addonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
  },
  addonInfo: {
    flex: 1,
    marginRight: 12,
  },
  addonName: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  addonPrice: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 13,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonText: {
    color: '#334155',
    fontSize: 20,
    fontWeight: '900',
  },
  qtyButtonDark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  qtyButtonTextDark: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  qtyText: {
    minWidth: 24,
    textAlign: 'center',
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 10,
  },
  checkoutCard: {
    marginTop: 20,
    borderRadius: 22,
    backgroundColor: '#fff7ed',
    padding: 16,
  },
  checkoutLabel: {
    color: '#9a3412',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  checkoutAmount: {
    marginTop: 6,
    color: '#7c2d12',
    fontSize: 26,
    fontWeight: '900',
  },
})