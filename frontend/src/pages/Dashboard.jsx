import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import OrderCard from '../components/OrderCard'
import { loadOrders, subscribeOrders, updateOrderStatus } from '../orderStore'

function Dashboard() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const fetchOrders = async () => {
      const orders = await loadOrders()
      setOrders(orders)
      setIsLoading(false)
    }

    fetchOrders()
    const unsubscribe = subscribeOrders((newOrders) => {
      setOrders(newOrders)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const updateStatus = async (orderId, nextStatus) => {
    setIsUpdating(true)
    try {
      const { error: updateError } = await updateOrderStatus(orderId, nextStatus)
      if (updateError) {
        throw updateError
      }
    } catch (statusError) {
      setError(statusError?.message || 'Failed to update order status.')
    } finally {
      setIsUpdating(false)
    }
  }

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => b.token_number - a.token_number),
    [orders],
  )

  const summary = useMemo(() => {
    const counts = {
      total: orders.length,
      received: 0,
      preparing: 0,
      ready: 0,
      takeAwayReady: 0,
      dineInActive: 0,
    }

    orders.forEach((order) => {
      counts[order.status] = (counts[order.status] || 0) + 1
      if (order.serviceType === 'Take Away' && order.status === 'ready') {
        counts.takeAwayReady += 1
      }
      if (order.serviceType === 'Dine In' && order.status !== 'waste') {
        counts.dineInActive += 1
      }
    })

    return counts
  }, [orders])

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6">
      <section className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Owner Console</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">Restaurant Command Center</h1>
            <p className="mt-2 text-sm text-slate-600">
              Monitor the live queue, kitchen flow, waiter requests, touch ordering, and customer token activity from here.
            </p>
          </div>
          <span className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
            Total Orders: {orders.length}
          </span>
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'New Orders', value: summary.received || 0, tone: 'bg-sky-50 text-sky-700' },
            { label: 'Kitchen Running', value: summary.preparing || 0, tone: 'bg-amber-50 text-amber-700' },
            { label: 'Take Away Ready', value: summary.takeAwayReady, tone: 'bg-emerald-50 text-emerald-700' },
            { label: 'Dine In Active', value: summary.dineInActive, tone: 'bg-violet-50 text-violet-700' },
          ].map((card) => (
            <article key={card.label} className={`rounded-3xl p-5 shadow-sm ring-1 ring-slate-200 ${card.tone}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">{card.label}</p>
              <p className="mt-3 text-4xl font-black">{card.value}</p>
            </article>
          ))}
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Link to="/kiosk" className="rounded-2xl bg-rose-500 px-4 py-4 text-center text-sm font-semibold text-white hover:bg-rose-600">
            Touch Order Screen
          </Link>
          <Link to="/kitchen" className="rounded-2xl bg-slate-900 px-4 py-4 text-center text-sm font-semibold text-white hover:bg-slate-800">
            Kitchen Screen
          </Link>
          <Link to="/display" className="rounded-2xl bg-emerald-600 px-4 py-4 text-center text-sm font-semibold text-white hover:bg-emerald-700">
            Outside Token LED
          </Link>
          <Link to="/waiter" className="rounded-2xl bg-amber-500 px-4 py-4 text-center text-sm font-semibold text-white hover:bg-amber-600">
            Waiter Add-on App
          </Link>
          <Link to="/analytics" className="rounded-2xl bg-slate-700 px-4 py-4 text-center text-sm font-semibold text-white hover:bg-slate-800">
            Analytics
          </Link>
          <Link to="/admin" className="rounded-2xl bg-white px-4 py-4 text-center text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50">
            Manage Menu
          </Link>
        </div>

        <div className="mb-6 rounded-3xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-900 ring-1 ring-rose-100">
          <p className="font-semibold">The touch order screen can run at the counter.</p>
          <p className="mt-1 text-rose-800">
            If a customer cannot use a phone, staff can place the order for them on this screen.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        )}

        {isLoading ? (
          <p className="rounded-xl bg-white p-6 text-sm font-medium text-slate-600">Loading orders...</p>
        ) : sortedOrders.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-sm font-medium text-slate-600">No orders yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStartPreparing={(id) => updateStatus(id, 'preparing')}
                onMarkReady={(id) => updateStatus(id, 'ready')}
                onMarkWaste={(id) => updateStatus(id, 'waste')}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default Dashboard
