import { useEffect, useMemo, useState } from 'react'
import { loadOrders, subscribeOrders, updateOrderStatus } from '../orderStore'

function Kitchen() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{order.businessName || 'Chaap Wala'}</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">Token #{order.token_number}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${order.serviceType === 'Take Away' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
          {order.serviceType || 'Walk-in'}
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
              Yeh screen kitchen LED ke liye hai. Naye orders aur currently preparing orders alag dikhte hain.
            </p>
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