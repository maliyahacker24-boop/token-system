import { useEffect, useMemo, useRef, useState } from 'react'
import { loadOrders, subscribeOrders, updateOrderStatus } from '../orderStore'
import { getServiceTypeLabel } from '../serviceType'

const ALERT_SEQUENCE = [
  { frequency: 1318.51, duration: 0.11, delay: 0 },
  { frequency: 1567.98, duration: 0.14, delay: 0.16 },
]

const getAudioContextClass = () => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.AudioContext || window.webkitAudioContext || null
}

const playKitchenAlert = async (audioContextRef) => {
  const AudioContextClass = getAudioContextClass()
  if (!AudioContextClass) {
    return false
  }

  if (!audioContextRef.current) {
    audioContextRef.current = new AudioContextClass()
  }

  const audioContext = audioContextRef.current
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  const startTime = audioContext.currentTime + 0.02

  ALERT_SEQUENCE.forEach((step) => {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    const noteStart = startTime + step.delay
    const noteEnd = noteStart + step.duration

    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(step.frequency, noteStart)

    gainNode.gain.setValueAtTime(0.0001, noteStart)
    gainNode.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, noteEnd)

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.start(noteStart)
    oscillator.stop(noteEnd + 0.02)
  })

  return true
}

function Kitchen() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const audioContextRef = useRef(null)
  const previousReceivedIdsRef = useRef(new Set())
  const hasInitializedOrdersRef = useRef(false)
  const alertMessageTimerRef = useRef(null)

  const enableKitchenSound = async () => {
    try {
      const AudioContextClass = getAudioContextClass()
      if (!AudioContextClass) {
        return false
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass()
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      const isRunning = audioContextRef.current.state === 'running'
      setSoundEnabled(isRunning)
      return isRunning
    } catch {
      setSoundEnabled(false)
      return false
    }
  }

  useEffect(() => {
    const fetchOrders = async () => {
      const nextOrders = await loadOrders()
      setOrders(nextOrders)
    }

    fetchOrders()
    const unsubscribe = subscribeOrders((nextOrders) => setOrders(nextOrders))

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    enableKitchenSound()

    const unlockOnInteraction = () => {
      enableKitchenSound()
    }

    const events = ['pointerdown', 'touchstart', 'keydown']
    events.forEach((eventName) => window.addEventListener(eventName, unlockOnInteraction, { passive: true }))

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, unlockOnInteraction))
    }
  }, [])

  useEffect(() => {
    const currentReceivedIds = new Set(
      orders.filter((order) => order.status === 'received').map((order) => order.id),
    )

    if (!hasInitializedOrdersRef.current) {
      previousReceivedIdsRef.current = currentReceivedIds
      hasInitializedOrdersRef.current = true
      return
    }

    const newReceivedOrders = orders.filter(
      (order) => order.status === 'received' && !previousReceivedIdsRef.current.has(order.id),
    )

    if (newReceivedOrders.length > 0) {
      const latestOrder = newReceivedOrders.sort((left, right) => right.token_number - left.token_number)[0]

      playKitchenAlert(audioContextRef)
        .then((played) => {
          setSoundEnabled(played)
        })
        .catch(() => {
          setSoundEnabled(false)
        })

      window.clearTimeout(alertMessageTimerRef.current)
      setAlertMessage(`Trin trin - new token #${latestOrder.token_number} received.`)
      alertMessageTimerRef.current = window.setTimeout(() => {
        setAlertMessage('')
      }, 4500)
    }

    previousReceivedIdsRef.current = currentReceivedIds
  }, [orders])

  useEffect(() => {
    return () => {
      window.clearTimeout(alertMessageTimerRef.current)
    }
  }, [])

  const newOrders = useMemo(
    () => orders.filter((order) => order.status === 'received').sort((a, b) => a.token_number - b.token_number),
    [orders],
  )

  const preparingOrders = useMemo(
    () => orders.filter((order) => order.status === 'preparing').sort((a, b) => a.token_number - b.token_number),
    [orders],
  )

  const changeStatus = async (orderId, nextStatus) => {
    setIsUpdating(true)
    setError('')

    try {
      const { error: updateError } = await updateOrderStatus(orderId, nextStatus)
      if (updateError) {
        throw updateError
      }
    } catch (statusError) {
      setError(statusError?.message || 'Kitchen status update failed.')
    } finally {
      setIsUpdating(false)
    }
  }

  const renderCard = (order, mode) => (
    <article key={order.id} className="rounded-[1.75rem] bg-white p-5 shadow-lg ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{order.businessName || 'Restro Token System'}</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">Token #{order.token_number}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${order.serviceType === 'Take Away' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
          {getServiceTypeLabel(order.serviceType) || 'Walk-in'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
        <span>Payment: {order.paymentMethod || 'Cash'}</span>
        <span>Source: {order.orderSource || 'Walk-in'}</span>
      </div>

      <div className="mt-5 space-y-2 rounded-3xl bg-slate-50 p-4">
        {(order.items || []).map((item, index) => (
          <div key={`${order.id}-${item.id || item.name}-${index}`} className="flex items-center justify-between text-base text-slate-700">
            <span>{item.name}</span>
            <span className="font-black text-slate-900">x{item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-3">
        {mode === 'new' && (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => changeStatus(order.id, 'preparing')}
            className="flex-1 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
          >
            Start Cooking
          </button>
        )}
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => changeStatus(order.id, 'ready')}
          className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          Mark Ready
        </button>
      </div>
    </article>
  )

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#020617_0%,#0f172a_45%,#1e293b_100%)] px-4 py-8 text-white sm:px-8">
      <section className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Kitchen Mode</p>
            <h1 className="mt-2 text-5xl font-black">Live Kitchen Queue</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              This screen is designed for the kitchen display. New orders and currently preparing orders are shown separately.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${soundEnabled ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20' : 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-300/20'}`}>
                {soundEnabled ? 'Alert sound active' : 'Tap once to enable alert sound'}
              </span>
              <button
                type="button"
                onClick={enableKitchenSound}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/15"
              >
                Enable Sound
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-3xl bg-white/10 px-5 py-4 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-300">New</p>
              <p className="mt-2 text-3xl font-black">{newOrders.length}</p>
            </div>
            <div className="rounded-3xl bg-white/10 px-5 py-4 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Preparing</p>
              <p className="mt-2 text-3xl font-black">{preparingOrders.length}</p>
            </div>
          </div>
        </header>

        {error && <p className="mb-5 rounded-2xl bg-rose-100 px-4 py-3 text-sm text-rose-700">{error}</p>}
  {alertMessage && <p className="mb-5 rounded-2xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">{alertMessage}</p>}

        <div className="grid gap-6 xl:grid-cols-2">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">New Orders</h2>
              <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
                Received
              </span>
            </div>
            <div className="space-y-4">
              {newOrders.length === 0 ? (
                <div className="rounded-[1.75rem] bg-white/10 p-6 text-sm text-slate-300 ring-1 ring-white/10">No fresh orders right now.</div>
              ) : (
                newOrders.map((order) => renderCard(order, 'new'))
              )}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">On Stove</h2>
              <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
                Preparing
              </span>
            </div>
            <div className="space-y-4">
              {preparingOrders.length === 0 ? (
                <div className="rounded-[1.75rem] bg-white/10 p-6 text-sm text-slate-300 ring-1 ring-white/10">No orders are being prepared.</div>
              ) : (
                preparingOrders.map((order) => renderCard(order, 'preparing'))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

export default Kitchen