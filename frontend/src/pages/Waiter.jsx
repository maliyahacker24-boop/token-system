import { useEffect, useMemo, useState } from 'react'
import { loadAdminConfigs, subscribeAdminConfigs } from '../adminStore'
import { addItemsToOrder, loadOrders, subscribeOrders, updateOrderStatus } from '../orderStore'
import { getServiceTypeLabel } from '../serviceType'

const normalizeText = (value) => `${value || ''}`.trim().toLowerCase()

const buildFallbackItems = (items = []) => {
  const itemMap = new Map()

  items.forEach((item) => {
    const itemName = `${item?.name || ''}`.trim()
    if (!itemName) {
      return
    }

    const itemId = item.id || itemName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
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

function Waiter() {
  const [orders, setOrders] = useState([])
  const [configs, setConfigs] = useState([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [tokenSearch, setTokenSearch] = useState('')
  const [addonItems, setAddonItems] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const [nextOrders, nextConfigs] = await Promise.all([loadOrders(), loadAdminConfigs()])
      setOrders(nextOrders)
      setConfigs(nextConfigs)
    }

    fetchData()
    const unsubscribe = subscribeOrders((nextOrders) => setOrders(nextOrders))
    const unsubscribeConfigs = subscribeAdminConfigs((nextConfigs) => setConfigs(nextConfigs))

    return () => {
      unsubscribe()
      unsubscribeConfigs()
    }
  }, [])

  const activeDineInOrders = useMemo(() => {
    const tokenQuery = tokenSearch.trim()

    return orders
      .filter((order) => order.serviceType === 'Dine In' && order.status !== 'waste')
      .filter((order) => (tokenQuery ? `${order.token_number}`.includes(tokenQuery) : true))
      .sort((a, b) => b.token_number - a.token_number)
  }, [orders, tokenSearch])

  useEffect(() => {
    if (!activeDineInOrders.length) {
      setSelectedOrderId('')
      return
    }

    const orderStillVisible = activeDineInOrders.some((order) => order.id === selectedOrderId)
    if (!orderStillVisible) {
      setSelectedOrderId(activeDineInOrders[0].id)
    }
  }, [activeDineInOrders, selectedOrderId])

  const selectedOrder = useMemo(
    () => activeDineInOrders.find((order) => order.id === selectedOrderId) || null,
    [activeDineInOrders, selectedOrderId],
  )

  const selectedConfig = useMemo(() => {
    if (!selectedOrder || configs.length === 0) {
      return null
    }

    const exactConfig = configs.find((config) => config.id === selectedOrder.businessId)
    if (exactConfig) {
      return exactConfig
    }

    const nameConfig = configs.find(
      (config) => normalizeText(config.businessName) === normalizeText(selectedOrder.businessName),
    )
    if (nameConfig) {
      return nameConfig
    }

    const orderItemNames = new Set((selectedOrder.items || []).map((item) => normalizeText(item.name)))
    const overlapConfig = configs
      .map((config) => ({
        config,
        score: (config.items || []).reduce(
          (total, item) => total + (orderItemNames.has(normalizeText(item.name)) ? 1 : 0),
          0,
        ),
      }))
      .sort((left, right) => right.score - left.score)[0]

    if (overlapConfig?.score > 0) {
      return overlapConfig.config
    }

    return configs.length === 1 ? configs[0] : null
  }, [configs, selectedOrder])

  const availableAddonItems = useMemo(() => {
    if (selectedConfig?.items?.length) {
      return selectedConfig.items
    }

    return buildFallbackItems(selectedOrder?.items)
  }, [selectedConfig, selectedOrder])

  const addMenuItem = (item) => {
    setAddonItems((currentItems) => {
      const existingItem = currentItems.find((currentItem) => currentItem.id === item.id)
      if (existingItem) {
        return currentItems.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, quantity: currentItem.quantity + 1 }
            : currentItem,
        )
      }

      return [...currentItems, { ...item, quantity: 1 }]
    })
  }

  const changeAddonQty = (itemId, delta) => {
    setAddonItems((currentItems) =>
      currentItems
        .map((item) =>
          item.id === itemId ? { ...item, quantity: Math.max(item.quantity + delta, 0) } : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const submitAddon = async () => {
    if (!selectedOrder) {
      setError('Select an eat-in order first.')
      return
    }

    if (addonItems.length === 0) {
      setError('Add at least one extra item.')
      return
    }

    setError('')
    setMessage('')
    setIsSaving(true)

    try {
      const { error: addError } = await addItemsToOrder(selectedOrder.id, addonItems)
      if (addError) {
        throw addError
      }

      if (selectedOrder.status === 'received') {
        await updateOrderStatus(selectedOrder.id, 'preparing')
      }

      setAddonItems([])
      setMessage(`Extra items were added to token #${selectedOrder.token_number}.`)
    } catch (submitError) {
      setError(submitError?.message || 'Failed to add extra items.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-slate-100 px-4 py-8 sm:px-6">
      <section className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">Waiter Mode</p>
            <h1 className="mt-2 text-4xl font-black text-slate-900">Add Items to Existing Table Order</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              If a customer requests extra bread, drinks, or additional items later, the waiter can add them to the same token from this screen.
            </p>
          </div>

          <div className="w-full max-w-xs rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <label className="text-sm font-semibold text-slate-700">Search token</label>
            <input
              type="text"
              value={tokenSearch}
              onChange={(event) => setTokenSearch(event.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Token number"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            />
          </div>
        </header>

        {message && <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>}
        {error && <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">Open Eat-In Orders</h2>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                {activeDineInOrders.length} active
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {activeDineInOrders.length === 0 ? (
                <div className="rounded-3xl bg-slate-50 p-5 text-sm text-slate-500">No active eat-in tokens found.</div>
              ) : (
                activeDineInOrders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full rounded-3xl p-4 text-left transition ${selectedOrderId === order.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900 hover:bg-slate-100'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] opacity-70">{order.businessName || 'Restro Token System'}</p>
                        <p className="mt-2 text-2xl font-black">Token #{order.token_number}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${selectedOrderId === order.id ? 'bg-white/15 text-white' : 'bg-amber-100 text-amber-700'}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm opacity-80">{(order.items || []).map((item) => `${item.name} x${item.quantity}`).join(', ')}</p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200">
            {selectedOrder ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selected Order</p>
                    <h2 className="mt-2 text-3xl font-black text-slate-900">Token #{selectedOrder.token_number}</h2>
                    <p className="mt-2 text-sm text-slate-600">{selectedOrder.businessName || 'Restro Token System'} • {getServiceTypeLabel(selectedOrder.serviceType)}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Current items</p>
                    <p className="mt-2 text-lg font-black text-slate-900">{(selectedOrder.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Existing Order</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {(selectedOrder.items || []).map((item, index) => (
                      <div key={`${item.id || item.name}-${index}`} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
                        {item.name} x{item.quantity}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-black text-slate-900">Add More Items</h3>
                  {!selectedConfig && availableAddonItems.length > 0 && (
                    <p className="mt-2 text-sm text-amber-700">
                      No saved menu configuration was found for this order, so the existing items are shown as quick add-on options.
                    </p>
                  )}
                  {availableAddonItems.length === 0 ? (
                    <div className="mt-4 rounded-3xl bg-slate-50 p-5 text-sm text-slate-500 ring-1 ring-slate-200">
                      No add-on menu was found for this token. Save the business menu in Admin first, or place the order from the correct business in the kiosk flow.
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {availableAddonItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addMenuItem(item)}
                        className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50"
                      >
                        <p className="text-base font-bold text-slate-900">{item.name}</p>
                        <p className="mt-1 text-sm text-slate-600">₹{item.price}</p>
                      </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-100">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-black text-slate-900">Current Add-on Cart</h3>
                    <span className="text-sm font-semibold text-slate-600">{addonItems.length} item(s)</span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {addonItems.length === 0 ? (
                      <p className="text-sm text-slate-500">No extra items selected yet.</p>
                    ) : (
                      addonItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-amber-100">
                          <div>
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="text-sm text-slate-500">₹{item.price}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => changeAddonQty(item.id, -1)}
                              className="h-9 w-9 rounded-xl bg-slate-200 text-lg font-semibold text-slate-700 hover:bg-slate-300"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-bold text-slate-900">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => changeAddonQty(item.id, 1)}
                              className="h-9 w-9 rounded-xl bg-slate-900 text-lg font-semibold text-white hover:bg-slate-700"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isSaving || addonItems.length === 0}
                    onClick={submitAddon}
                    className="mt-5 w-full rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    {isSaving ? 'Updating order...' : 'Add selected items to token'}
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-3xl bg-slate-50 p-6 text-sm text-slate-500">Select an eat-in order from the left to add extra items.</div>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}

export default Waiter