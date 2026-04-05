import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import Cart from '../components/Cart'
import CheckoutUpsellModal from '../components/CheckoutUpsellModal'
import CustomerNameModal from '../components/CustomerNameModal'
import Menu from '../components/Menu'
import OrderConfirmationModal from '../components/OrderConfirmationModal'
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

const GST_RATE = 0.05

const formatMoney = (value) => Number(value.toFixed(2))

const formatCustomerName = (value) =>
  value
    .replace(/\s+/g, ' ')
    .trimStart()
    .slice(0, 32)

const getPaymentMethodLabel = (value) => {
  if (`${value || ''}`.trim().toLowerCase() === 'prepaid') {
    return 'Online'
  }

  return value || 'Cash'
}

const KIOSK_IDLE_TIMEOUT_MS = 90000

const KIOSK_PROMO_COLUMNS = [
  [
    { eyebrow: 'Chef Picks', title: 'Signature wraps', detail: 'Hot, fast, and tap-ready in one touch.' },
    { eyebrow: 'Quick Order', title: 'Touch. Add. Checkout.', detail: 'Built for counter ordering without confusion.' },
    { eyebrow: 'Most Loved', title: 'Cold drinks upsell', detail: 'Smart add-ons before payment for higher bills.' },
    { eyebrow: 'Live Queue', title: 'Instant token flow', detail: 'Every order moves straight to kitchen and display.' },
  ],
  [
    { eyebrow: 'Premium UI', title: 'Modern kiosk motion', detail: 'Smooth movement and bold contrast for public screens.' },
    { eyebrow: 'Built To Sell', title: 'Large item cards', detail: 'Easy scanning for standing customers and staff.' },
    { eyebrow: 'Fast Checkout', title: 'Cart always visible', detail: 'No hidden steps, no messy ordering path.' },
    { eyebrow: 'Restaurant Ready', title: 'Runs all day', detail: 'Made for touch use at the counter and lobby.' },
  ],
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
  const [isOrderConfirmationOpen, setIsOrderConfirmationOpen] = useState(false)
  const [isCustomerNameModalOpen, setIsCustomerNameModalOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [isKioskSessionActive, setIsKioskSessionActive] = useState(!isKioskMode)
  const receiptRef = useRef(null)
  const kioskIdleTimerRef = useRef(null)

  const clearKioskIdleTimer = () => {
    if (kioskIdleTimerRef.current) {
      window.clearTimeout(kioskIdleTimerRef.current)
      kioskIdleTimerRef.current = null
    }
  }

  const resetKioskExperience = () => {
    clearKioskIdleTimer()
    setIsCheckoutUpsellOpen(false)
    setIsOrderConfirmationOpen(false)
    setIsCustomerNameModalOpen(false)
    setCartItems([])
    setServiceType('')
    setCustomerName('')
    setPaymentMethod('Cash')
    setOrderSource('Kiosk')
    setError('')
    setIsKioskSessionActive(false)
  }

  const activateKioskExperience = () => {
    setError('')
    setIsKioskSessionActive(true)
  }

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
    setIsKioskSessionActive(!isKioskMode)
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

  useEffect(() => {
    if (!isKioskMode || !isKioskSessionActive || receiptOrder) {
      clearKioskIdleTimer()
      return undefined
    }

    const handleActivity = () => {
      clearKioskIdleTimer()
      kioskIdleTimerRef.current = window.setTimeout(() => {
        resetKioskExperience()
      }, KIOSK_IDLE_TIMEOUT_MS)
    }

    handleActivity()

    const events = ['pointerdown', 'touchstart', 'keydown', 'wheel']
    events.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }))

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, handleActivity))
      clearKioskIdleTimer()
    }
  }, [isKioskMode, isKioskSessionActive, receiptOrder])

  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  )

  const gstAmount = useMemo(() => formatMoney(totalPrice * GST_RATE), [totalPrice])
  const finalTotal = useMemo(() => formatMoney(totalPrice + gstAmount), [gstAmount, totalPrice])

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

  const openCustomerNameModal = () => {
    setError('')
    setIsCustomerNameModalOpen(true)
  }

  const closeCustomerNameModal = () => {
    setIsCustomerNameModalOpen(false)
  }

  const appendCustomerNameCharacter = (character) => {
    setCustomerName((currentValue) => formatCustomerName(`${currentValue}${character}`))
  }

  const deleteCustomerNameCharacter = () => {
    setCustomerName((currentValue) => currentValue.slice(0, -1))
  }

  const clearCustomerName = () => {
    setCustomerName('')
  }

  const confirmEatInService = () => {
    const trimmedName = customerName.trim()
    if (!trimmedName) {
      return
    }

    setCustomerName(trimmedName)
    setServiceType('Dine In')
    setIsCustomerNameModalOpen(false)
  }

  const openOrderConfirmation = () => {
    if (cartItems.length === 0) {
      setError('Please add at least one item to place the order.')
      return
    }

    setError('')
    setIsCheckoutUpsellOpen(false)
    setIsOrderConfirmationOpen(true)
  }

  const closeOrderConfirmation = () => {
    setIsOrderConfirmationOpen(false)
  }

  const goBackToAddOns = () => {
    setIsOrderConfirmationOpen(false)
    setIsCheckoutUpsellOpen(true)
  }

  const placeOrder = async (selectedPaymentMethod = paymentMethod) => {
    if (cartItems.length === 0) {
      setError('Please add at least one item to place the order.')
      return
    }

    setError('')
    setIsPlacingOrder(true)
    setIsCheckoutUpsellOpen(false)
    setIsOrderConfirmationOpen(false)
    setPaymentMethod(selectedPaymentMethod)

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
        paymentMethod: selectedPaymentMethod,
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

      setReceiptOrder({
        ...orderPayload,
        paymentMethod: selectedPaymentMethod,
        customerName: serviceType === 'Dine In' ? customerName.trim() : '',
        gst_amount: gstAmount,
        grand_total: finalTotal,
      })
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
    const receiptSubtotal = receiptOrder.items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    )
    const receiptGst = formatMoney(receiptSubtotal * GST_RATE)
    const receiptFinalTotal = formatMoney(receiptSubtotal + receiptGst)

    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50 to-emerald-50 px-4 py-10">
        <section ref={receiptRef} className="mx-auto max-w-lg rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200 printable-receipt">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Tax Invoice</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">{businessName}</h1>
            <p className="mt-3 text-sm font-semibold text-slate-700">{getServiceTypeLabel(receiptOrder.serviceType || serviceType)}</p>
            {receiptOrder.customerName && <p className="mt-2 text-sm font-semibold text-slate-700">Customer: {receiptOrder.customerName}</p>}
            <p className="mt-2 text-sm text-slate-600">Order Date: {receiptDate}</p>
          </div>
          <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Bill To</p>
            <p>{receiptOrder.customerName || 'Customer'}</p>
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
            {receiptOrder.customerName && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Customer Name</p>
                <p className="font-semibold text-slate-900">{receiptOrder.customerName}</p>
              </div>
            )}
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
              <span>Subtotal</span>
              <span>₹{receiptSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>GST (5%)</span>
              <span>₹{receiptGst.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between font-semibold text-slate-900">
              <span>Grand Total</span>
              <span>₹{receiptFinalTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Payment Mode</span>
              <span>{getPaymentMethodLabel(receiptOrder.paymentMethod || paymentMethod)}</span>
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

  if (isKioskMode && !isKioskSessionActive) {
    const summaryCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

    return (
      <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(160deg,#020617_0%,#0f172a_38%,#0b1120_100%)] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="kiosk-grid-sheen absolute inset-0 opacity-40" />
          <div className="kiosk-orb-float absolute -left-20 top-16 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="kiosk-orb-float absolute right-0 top-1/3 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" style={{ animationDelay: '1.6s' }} />
          <div className="kiosk-orb-float absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-400/12 blur-3xl" style={{ animationDelay: '0.8s' }} />
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-4 hidden w-56 overflow-hidden xl:block">
          <div className="kiosk-scroll-track kiosk-scroll-down space-y-4 py-6">
            {[...KIOSK_PROMO_COLUMNS[0], ...KIOSK_PROMO_COLUMNS[0]].map((promo, index) => (
              <article key={`${promo.title}-${index}`} className="rounded-[1.7rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200">{promo.eyebrow}</p>
                <h3 className="mt-3 text-2xl font-black text-white">{promo.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{promo.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-4 hidden w-56 overflow-hidden xl:block">
          <div className="kiosk-scroll-track kiosk-scroll-up space-y-4 py-6">
            {[...KIOSK_PROMO_COLUMNS[1], ...KIOSK_PROMO_COLUMNS[1]].map((promo, index) => (
              <article key={`${promo.title}-${index}`} className="rounded-[1.7rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200">{promo.eyebrow}</p>
                <h3 className="mt-3 text-2xl font-black text-white">{promo.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{promo.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <section className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
          <div className="kiosk-panel-rise w-full max-w-3xl rounded-[2.5rem] border border-white/10 bg-white/8 p-6 text-center shadow-[0_30px_120px_rgba(2,6,23,0.5)] backdrop-blur-2xl sm:p-10">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[linear-gradient(135deg,#fde68a_0%,#facc15_50%,#f59e0b_100%)] text-3xl font-black text-slate-950 shadow-[0_14px_34px_rgba(250,204,21,0.28)] sm:h-28 sm:w-28">
              RT
            </div>

            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.36em] text-sky-200">Premium Self Ordering</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-6xl">
              Touch Here To Start
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-slate-300 sm:text-base">
              A public-facing counter ordering experience with animated motion, large touch targets, fast checkout, and live token routing.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Fast Flow', value: 'Tap to build the order in seconds' },
                { label: 'Live Queue', value: 'Kitchen and display update instantly' },
                { label: 'Premium UI', value: 'Designed for walk-in self service' },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4 text-left backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.value}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={activateKioskExperience}
              className="touch-start-pulse mt-10 inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#fde68a_0%,#facc15_50%,#f59e0b_100%)] px-10 py-5 text-lg font-black text-slate-950 shadow-[0_18px_44px_rgba(250,204,21,0.24)] transition hover:scale-[1.02]"
            >
              Touch Here To Start
            </button>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <span>Self order kiosk</span>
              <span className="h-1 w-1 rounded-full bg-slate-500" />
              <span>{businessName}</span>
              <span className="h-1 w-1 rounded-full bg-slate-500" />
              <span>{summaryCount > 0 ? `${summaryCount} items waiting` : 'Ready for new order'}</span>
            </div>

            {availableBusinesses.length > 1 && (
              <div className="mt-8 rounded-[1.7rem] border border-white/10 bg-white/6 p-4 text-left backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Select restaurant</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {availableBusinesses.map((business) => (
                    <button
                      key={business.id}
                      type="button"
                      onClick={() => applyBusinessConfig(business)}
                      className={`rounded-full px-4 py-3 text-sm font-semibold transition ${selectedBusinessId === business.id ? 'bg-white text-slate-950' : 'bg-white/8 text-white hover:bg-white/15'}`}
                    >
                      {business.businessName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    )
  }

  if (!serviceType) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.2),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.18),_transparent_26%),linear-gradient(135deg,#fff7ed_0%,#f8fafc_48%,#eff6ff_100%)] px-4 py-8 sm:px-6">
        <section className="kiosk-panel-rise mx-auto max-w-5xl rounded-[2.25rem] border border-white/70 bg-white/85 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 backdrop-blur sm:p-10">
          {isKioskMode && availableBusinesses.length > 1 && (
            <div className="mb-8 rounded-[1.8rem] border border-slate-200 bg-slate-50/90 p-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Select restaurant</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {availableBusinesses.map((business) => (
                  <button
                    key={business.id}
                    type="button"
                    onClick={() => applyBusinessConfig(business)}
                    className={`rounded-[1.45rem] px-5 py-4 text-left transition ${selectedBusinessId === business.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100'}`}
                  >
                    <p className="text-lg font-black">{business.businessName}</p>
                    <p className="mt-1 text-sm opacity-75">{business.businessType}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-[1.9rem] bg-[linear-gradient(135deg,#111827_0%,#0f172a_55%,#1d4ed8_100%)] px-6 py-8 text-center text-white shadow-[0_18px_60px_rgba(15,23,42,0.28)] sm:px-10 sm:py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-sky-200">Please choose</p>
            <h1 className="mt-6 text-4xl font-black sm:text-5xl">Eat In or Take Out?</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
              Use this touch-friendly screen to start the order fast, then tap menu items just like a self-order kiosk.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={openCustomerNameModal}
              className="rounded-[1.8rem] border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Inside dining</p>
              <p className="mt-4 text-3xl font-black text-slate-900">EAT IN</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">Select this when the customer will sit and eat at the table or inside the restaurant.</p>
            </button>
            <button
              type="button"
              onClick={() => setServiceType('Take Away')}
              className="rounded-[1.8rem] border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5_0%,#d1fae5_48%,#f0fdf4_100%)] p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Packed order</p>
              <p className="mt-4 text-3xl font-black text-slate-900">TAKE OUT</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">Select this when the order should be packed for pickup or takeaway.</p>
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            Select one option before you can continue to the menu.
          </p>
        </section>

        <CustomerNameModal
          isOpen={isCustomerNameModalOpen}
          value={customerName}
          onAppend={appendCustomerNameCharacter}
          onBackspace={deleteCustomerNameCharacter}
          onClear={clearCustomerName}
          onClose={closeCustomerNameModal}
          onConfirm={confirmEatInService}
        />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),_transparent_24%),linear-gradient(135deg,#fff7ed_0%,#f8fafc_48%,#eff6ff_100%)] px-3 py-4 sm:px-4 sm:py-6">
      <section className="mx-auto max-w-[1600px] space-y-5">
        <header className="kiosk-panel-rise overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#111827_0%,#0f172a_55%,#1d4ed8_100%)] p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.2)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">Customer Ordering</p>
              <h1 className="mt-3 text-3xl font-black sm:text-5xl">
                {isKioskMode ? `${businessName} Touch Ordering` : businessName}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-200 sm:text-base">
                {isKioskMode ? 'Touchscreen ordering layout inspired by modern self-service kiosks.' : `${businessType} menu for customers with a fast tap-to-order flow.`}
              </p>
            </div>

            <div className="grid min-w-[220px] grid-cols-2 gap-3">
              <div className="rounded-[1.25rem] bg-white/10 px-4 py-3 ring-1 ring-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Service</p>
                <p className="mt-2 text-xl font-black">{getServiceTypeLabel(serviceType)}</p>
              </div>
              <div className="rounded-[1.25rem] bg-white/10 px-4 py-3 ring-1 ring-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Menu Items</p>
                <p className="mt-2 text-xl font-black">{menuItems.length}</p>
              </div>
              <div className="rounded-[1.25rem] bg-white/10 px-4 py-3 ring-1 ring-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Cart Qty</p>
                <p className="mt-2 text-xl font-black">{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</p>
              </div>
              <div className="rounded-[1.25rem] bg-white/10 px-4 py-3 ring-1 ring-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Order Value</p>
                <p className="mt-2 text-xl font-black">₹{finalTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </header>

        {error && <p className="rounded-[1.4rem] bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 shadow-sm ring-1 ring-rose-100">{error}</p>}

        {isKioskMode && availableBusinesses.length > 1 && (
          <section className="rounded-[1.8rem] border border-white/70 bg-white/80 p-4 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Restaurant</p>
                <p className="mt-2 text-sm text-slate-600">Switch the active kiosk menu before placing the order.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {availableBusinesses.map((business) => (
                  <button
                    key={business.id}
                    type="button"
                    onClick={() => applyBusinessConfig(business)}
                    className={`rounded-full px-4 py-3 text-sm font-semibold transition ${selectedBusinessId === business.id ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    {business.businessName}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="kiosk-panel-rise rounded-[1.8rem] border border-white/70 bg-white/80 p-4 shadow-sm ring-1 ring-slate-200/70 backdrop-blur sm:p-5" style={{ animationDelay: '120ms' }}>
          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr_0.7fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Payment Method</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {['Cash', 'Prepaid'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition ${paymentMethod === method ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Order Source</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {[(isKioskMode ? 'Kiosk' : 'Walk-in'), 'Swiggy', 'Zomato', 'Other'].map((source) => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => setOrderSource(source)}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition ${orderSource === source ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1.4rem] bg-[linear-gradient(135deg,#fff7ed_0%,#fffbeb_100%)] px-5 py-4 ring-1 ring-amber-100">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Session Summary</p>
              <p className="mt-3 text-sm text-slate-700">Service: {getServiceTypeLabel(serviceType)}</p>
              {customerName && <p className="mt-2 text-sm text-slate-700">Customer: {customerName}</p>}
              <p className="mt-2 text-sm text-slate-700">Payment: {getPaymentMethodLabel(paymentMethod)}</p>
              <p className="mt-2 text-sm text-slate-700">Source: {orderSource}</p>
              <p className="mt-2 text-sm text-slate-700">GST: ₹{gstAmount.toFixed(2)}</p>
            </div>
          </div>
        </section>

        <div className="kiosk-panel-rise grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]" style={{ animationDelay: '220ms' }}>
          <Menu items={menuItems} onAddToCart={addToCart} businessName={businessName} />
          <Cart
            cartItems={cartItems}
            totalPrice={totalPrice}
            onIncrement={incrementQty}
            onDecrement={decrementQty}
            onPlaceOrder={openCheckoutUpsell}
            isPlacingOrder={isPlacingOrder}
            businessName={businessName}
            serviceLabel={getServiceTypeLabel(serviceType)}
            paymentMethod={paymentMethod}
            orderSource={orderSource}
          />
        </div>
      </section>

      <CheckoutUpsellModal
        isOpen={isCheckoutUpsellOpen}
        drinks={DRINK_UPSELL_ITEMS}
        cartItems={cartItems}
        subtotal={totalPrice}
        gstAmount={gstAmount}
        finalTotal={finalTotal}
        onAddDrink={addToCart}
        onClose={closeCheckoutUpsell}
        onSkipCheckout={openOrderConfirmation}
        onContinue={openOrderConfirmation}
        isPlacingOrder={isPlacingOrder}
      />

      <OrderConfirmationModal
        isOpen={isOrderConfirmationOpen}
        cartItems={cartItems}
        customerName={customerName}
        serviceLabel={getServiceTypeLabel(serviceType)}
        orderSource={orderSource}
        subtotal={totalPrice}
        gstAmount={gstAmount}
        finalTotal={finalTotal}
        gstRateLabel="5%"
        onBack={goBackToAddOns}
        onConfirmCash={() => placeOrder('Cash')}
        onConfirmOnline={() => placeOrder('Prepaid')}
        isPlacingOrder={isPlacingOrder}
      />
    </main>
  )
}

export default MenuPage
