import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import Cart from '../components/Cart'
import CheckoutUpsellModal from '../components/CheckoutUpsellModal'
import Menu from '../components/Menu'
import { getLatestOrder, saveOrder } from '../orderStore'
import { loadAdminConfigs, subscribeAdminConfigs } from '../adminStore'
import { getServiceTypeLabel } from '../serviceType'

const MENU_ITEMS = [
  { id: 'veg-momos', name: 'Veg Momos', price: 60 },
  { id: 'burger', name: 'Burger', price: 80 },
  { id: 'chowmein', name: 'Chowmein', price: 90 },
  { id: 'cold-drink', name: 'Cold Drink', price: 30 },
]

const createDrinkImage = (label, fillColor, accentColor, bubbleColor) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="${label}">
      <defs>
        <linearGradient id="drink-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${fillColor}" />
          <stop offset="100%" stop-color="${accentColor}" />
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="48" fill="#ffffff" fill-opacity="0" />
      <circle cx="62" cy="64" r="14" fill="${bubbleColor}" fill-opacity="0.28" />
      <circle cx="182" cy="54" r="10" fill="${bubbleColor}" fill-opacity="0.22" />
      <circle cx="175" cy="95" r="7" fill="${bubbleColor}" fill-opacity="0.34" />
      <path d="M96 42h48l9 24v12c0 6-5 11-11 11h-4v88c0 11-8 21-19 21h-2c-11 0-19-10-19-21V89h-4c-6 0-11-5-11-11V66l13-24z" fill="url(#drink-gradient)" />
      <rect x="103" y="26" width="34" height="20" rx="7" fill="${accentColor}" />
      <rect x="104" y="97" width="32" height="54" rx="10" fill="#ffffff" fill-opacity="0.18" />
      <text x="120" y="125" text-anchor="middle" font-size="16" font-family="Arial, sans-serif" font-weight="700" fill="#ffffff">${label}</text>
      <rect x="86" y="170" width="68" height="10" rx="5" fill="#ffffff" fill-opacity="0.22" />
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const DRINK_UPSELL_ITEMS = [
  {
    id: 'sprite-250ml',
    name: 'Sprite 250ml',
    price: 40,
    description: 'Lemon-lime cold drink served chilled.',
    badge: 'Most Popular',
    imageBackground: 'bg-[radial-gradient(circle_at_top,#dcfce7_0%,#86efac_40%,#16a34a_100%)]',
    image: createDrinkImage('SPRITE', '#22c55e', '#15803d', '#dcfce7'),
  },
  {
    id: 'coca-cola-250ml',
    name: 'Coca-Cola 250ml',
    price: 45,
    description: 'Classic cola with a strong fizz kick.',
    badge: 'Best Seller',
    imageBackground: 'bg-[radial-gradient(circle_at_top,#fee2e2_0%,#fca5a5_38%,#b91c1c_100%)]',
    image: createDrinkImage('COLA', '#ef4444', '#991b1b', '#fee2e2'),
  },
  {
    id: 'thums-up-250ml',
    name: 'Thums Up 250ml',
    price: 45,
    description: 'Bold sparkling cola for spicy meals.',
    badge: 'Strong Taste',
    imageBackground: 'bg-[radial-gradient(circle_at_top,#dbeafe_0%,#93c5fd_38%,#1d4ed8_100%)]',
    image: createDrinkImage('THUMS', '#2563eb', '#1e3a8a', '#dbeafe'),
  },
  {
    id: 'fanta-250ml',
    name: 'Fanta 250ml',
    price: 40,
    description: 'Sweet orange soft drink for combo upsell.',
    badge: 'Kids Choice',
    imageBackground: 'bg-[radial-gradient(circle_at_top,#fed7aa_0%,#fdba74_38%,#ea580c_100%)]',
    image: createDrinkImage('FANTA', '#f97316', '#c2410c', '#ffedd5'),
  },
]

const generateOrderId = () =>
  window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

function MenuPage() {
  const location = useLocation()
  const isKioskMode = location.pathname === '/kiosk'
  const selectedBusinessParam = new URLSearchParams(location.search).get('biz')
  const [cartItems, setCartItems] = useState([])
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [error, setError] = useState('')
  const [receiptOrder, setReceiptOrder] = useState(null)
  const [serviceType, setServiceType] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [orderSource, setOrderSource] = useState(isKioskMode ? 'Kiosk' : 'Walk-in')
  const [availableBusinesses, setAvailableBusinesses] = useState([])
  const [menuItems, setMenuItems] = useState(MENU_ITEMS)
  const [businessType, setBusinessType] = useState('Restaurant')
  const [businessName, setBusinessName] = useState('Customer Menu')
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [isCheckoutUpsellOpen, setIsCheckoutUpsellOpen] = useState(false)
  const receiptRef = useRef(null)

  const applyBusinessConfig = (config) => {
    if (!config) {
      setMenuItems(MENU_ITEMS)
      setBusinessType('Restaurant')
      setBusinessName('Customer Menu')
      setSelectedBusinessId('')
      return
    }

    setMenuItems(config.items)
    setBusinessType(config.businessType || 'Restaurant')
    setBusinessName(config.businessName)
    setSelectedBusinessId(config.id)
  }

  const downloadReceiptPdf = async () => {
    if (!receiptRef.current || !receiptOrder) {
      return
    }

    const canvas = await html2canvas(receiptRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    })

    const imageData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'pt', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imageWidth = pageWidth
    const imageHeight = (canvas.height * imageWidth) / canvas.width
    let heightLeft = imageHeight
    let position = 0

    pdf.addImage(imageData, 'PNG', 0, position, imageWidth, imageHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position -= pageHeight
      pdf.addPage()
      pdf.addImage(imageData, 'PNG', 0, position, imageWidth, imageHeight)
      heightLeft -= pageHeight
    }

    pdf.save(`receipt-${receiptOrder.token_number}.pdf`)
  }

  useEffect(() => {
    setOrderSource(isKioskMode ? 'Kiosk' : 'Walk-in')
  }, [isKioskMode])

  useEffect(() => {
    const loadConfig = async () => {
      const configs = await loadAdminConfigs()
      setAvailableBusinesses(configs)
      setError('')

      if (selectedBusinessParam) {
        const selectedConfig = configs.find((config) => config.id === selectedBusinessParam)
        if (selectedConfig) {
          applyBusinessConfig(selectedConfig)
          return
        }

        setError('Selected restaurant not found. Please use the QR link from the home page.')
      }

      if (configs.length === 0) {
        applyBusinessConfig(null)
        return
      }

      if (configs.length === 1) {
        applyBusinessConfig(configs[0])
        return
      }

      if (isKioskMode) {
        const activeConfig = configs.find((config) => config.id === selectedBusinessId) || configs[0]
        applyBusinessConfig(activeConfig)
        return
      }

      if (configs.length > 1) {
        setError('Choose a restaurant QR from the home screen to open its menu.')
      }
    }

    loadConfig()

    const unsubscribe = subscribeAdminConfigs(() => {
      loadConfig()
    })

    return () => {
      unsubscribe()
    }
  }, [isKioskMode, selectedBusinessId, selectedBusinessParam])

  useEffect(() => {
    if (!receiptOrder) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      window.print()
    }, 300)

    return () => {
      window.clearTimeout(timer)
    }
  }, [receiptOrder])

  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  )

  const addToCart = (menuItem) => {
    setCartItems((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === menuItem.id)
      if (existingItem) {
        return currentCart.map((item) =>
          item.id === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }

      return [...currentCart, { ...menuItem, quantity: 1 }]
    })
  }

  const incrementQty = (itemId) => {
    setCartItems((currentCart) =>
      currentCart.map((item) =>
        item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    )
  }

  const decrementQty = (itemId) => {
    setCartItems((currentCart) =>
      currentCart
        .map((item) =>
          item.id === itemId ? { ...item, quantity: Math.max(item.quantity - 1, 0) } : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const openCheckoutUpsell = () => {
    if (cartItems.length === 0) {
      setError('Please add at least one item to place the order.')
      return
    }

    setError('')
    setIsCheckoutUpsellOpen(true)
  }

  const closeCheckoutUpsell = () => {
    setIsCheckoutUpsellOpen(false)
  }

  const placeOrder = async () => {
    if (cartItems.length === 0) {
      setError('Please add at least one item to place the order.')
      return
    }

    setError('')
    setIsPlacingOrder(true)
    setIsCheckoutUpsellOpen(false)

    try {
      const { data: latestOrderData } = await getLatestOrder()
      const lastTokenNumber = latestOrderData?.[0]?.token_number ?? 200
      const nextTokenNumber = lastTokenNumber + 1

      const orderPayload = {
        id: generateOrderId(),
        token_number: nextTokenNumber,
        created_at: new Date().toISOString(),
        businessId: selectedBusinessId,
        businessName,
        serviceType,
        paymentMethod,
        orderSource,
        items: cartItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        total_price: totalPrice,
        status: 'received',
      }

      const { error: insertError } = await saveOrder(orderPayload)
      if (insertError) {
        throw insertError
      }

      setReceiptOrder(orderPayload)
      setCartItems([])
    } catch (insertOrderError) {
      setError(insertOrderError?.message || 'Could not place order. Please try again.')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  if (receiptOrder) {
    const receiptDate = new Date(receiptOrder.created_at).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50 to-emerald-50 px-4 py-10">
        <section ref={receiptRef} className="mx-auto max-w-lg rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200 printable-receipt">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Tax Invoice</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">{businessName}</h1>
            <p className="mt-3 text-sm font-semibold text-slate-700">{getServiceTypeLabel(receiptOrder.serviceType || serviceType)}</p>
            <p className="mt-2 text-sm text-slate-600">Order Date: {receiptDate}</p>
          </div>
          <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Bill To</p>
            <p>Customer</p>
            <p className="mt-3 font-semibold text-slate-900">Receipt Info</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Token</p>
                <p className="font-semibold text-slate-900">#{receiptOrder.token_number}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Order ID</p>
                <p className="font-semibold text-slate-900">{receiptOrder.id}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Restaurant</p>
                <p className="font-semibold text-slate-900">{receiptOrder.businessName || businessName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Service</p>
                <p className="font-semibold text-slate-900">{getServiceTypeLabel(receiptOrder.serviceType || serviceType)}</p>
              </div>
            </div>
          </div>

          <div className="mb-6 grid gap-3 rounded-3xl bg-slate-50 p-4 text-left text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Token Number</span>
              <span className="font-bold text-slate-900">{receiptOrder.token_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Order ID</span>
              <span className="text-slate-600">{receiptOrder.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Service</span>
              <span>{getServiceTypeLabel(receiptOrder.serviceType || serviceType)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total Items</span>
              <span>{receiptOrder.items.length}</span>
            </div>
          </div>

          <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 text-sm shadow-sm">
            <div className="grid grid-cols-[1fr_1fr_1fr_0.8fr] gap-3 bg-slate-100 px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-600">
              <span>Item</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="divide-y divide-slate-200 bg-white">
              {receiptOrder.items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="grid grid-cols-[1fr_1fr_1fr_0.8fr] gap-3 px-4 py-3 text-sm text-slate-700">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-right">{item.quantity}</span>
                  <span className="text-right">₹{item.price}</span>
                  <span className="text-right">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6 space-y-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
            <div className="flex items-center justify-between font-semibold text-slate-900">
              <span>Grand Total</span>
              <span>₹{receiptOrder.total_price}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Payment Mode</span>
              <span>{receiptOrder.paymentMethod || paymentMethod}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Order Source</span>
              <span>{receiptOrder.orderSource || orderSource}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-center sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={downloadReceiptPdf}
              className="rounded-3xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-3xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Back to menu
            </button>
          </div>
        </section>
      </main>
    )
  }

  if (!serviceType) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-amber-100 px-4 py-10">
        <section className="mx-auto max-w-4xl rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-200 text-center">
          {isKioskMode && availableBusinesses.length > 1 && (
            <div className="mb-8 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Select restaurant</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {availableBusinesses.map((business) => (
                  <button
                    key={business.id}
                    type="button"
                    onClick={() => applyBusinessConfig(business)}
                    className={`rounded-3xl px-5 py-4 text-left transition ${selectedBusinessId === business.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100'}`}
                  >
                    <p className="text-lg font-black">{business.businessName}</p>
                    <p className="mt-1 text-sm opacity-75">{business.businessType}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-600">Please choose</p>
          <h1 className="mt-6 text-4xl font-black text-slate-900">Eat In or Take Out?</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Choose Eat In if the customer will have the food here.
            <br />
            Choose Take Out if the order should be packed to go.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setServiceType('Dine In')}
              className="rounded-3xl bg-slate-900 px-6 py-6 text-xl font-bold text-white shadow-lg transition hover:bg-slate-700"
            >
              EAT IN
            </button>
            <button
              type="button"
              onClick={() => setServiceType('Take Away')}
              className="rounded-3xl bg-emerald-600 px-6 py-6 text-xl font-bold text-white shadow-lg transition hover:bg-emerald-500"
            >
              TAKE OUT
            </button>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            Select one option before you can continue to the menu.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-amber-100 px-4 py-10">
      <section className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <header className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Customer Menu</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">
            {isKioskMode ? `${businessName} Touch Ordering` : businessName}
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            {isKioskMode ? 'Touchscreen order station for walk-in guests.' : `${businessType} menu for customers.`}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-700">Service: {getServiceTypeLabel(serviceType)}</p>
          {error && <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        </header>

        <div className="mb-8 grid gap-4 xl:grid-cols-[1.6fr_0.95fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-lg font-bold text-slate-900">Payment & Source</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">Payment Method</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {['Cash', 'Prepaid'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-3xl px-5 py-4 text-sm font-semibold transition ${paymentMethod === method ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">Order Source</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {[(isKioskMode ? 'Kiosk' : 'Walk-in'), 'Swiggy', 'Zomato', 'Other'].map((source) => (
                    <button
                      key={source}
                      type="button"
                      onClick={() => setOrderSource(source)}
                      className={`rounded-3xl px-5 py-4 text-sm font-semibold transition ${orderSource === source ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}`}
                    >
                      {source}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-slate-700">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-amber-700">Order summary</p>
            <p className="mt-3 text-sm">Payment: {paymentMethod}</p>
            <p className="mt-2 text-sm">Source: {orderSource}</p>
            <p className="mt-2 text-sm">Service: {getServiceTypeLabel(serviceType)}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <Menu items={menuItems} onAddToCart={addToCart} />
          <Cart
            cartItems={cartItems}
            totalPrice={totalPrice}
            onIncrement={incrementQty}
            onDecrement={decrementQty}
            onPlaceOrder={openCheckoutUpsell}
            isPlacingOrder={isPlacingOrder}
          />
        </div>
      </section>

      <CheckoutUpsellModal
        isOpen={isCheckoutUpsellOpen}
        drinks={DRINK_UPSELL_ITEMS}
        onAddDrink={addToCart}
        onClose={closeCheckoutUpsell}
        onSkipCheckout={placeOrder}
        onContinue={placeOrder}
        isPlacingOrder={isPlacingOrder}
      />
    </main>
  )
}

export default MenuPage
