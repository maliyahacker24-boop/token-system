const statusStyleMap = {
  received: 'bg-sky-100 text-sky-700',
  preparing: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  waste: 'bg-rose-100 text-rose-700',
}

function OrderCard({ order, onStartPreparing, onMarkReady, onMarkWaste, isUpdating }) {
  const orderTime = new Date(order.created_at).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-extrabold text-slate-900">Token #{order.token_number}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusStyleMap[order.status] || 'bg-slate-100 text-slate-700'}`}>
          {order.status}
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-500">Ordered at {orderTime}</p>
      <div className="mt-3 space-y-1 text-xs text-slate-500">
        <p>Service: {order.serviceType || 'N/A'}</p>
        <p>Payment: {order.paymentMethod || 'N/A'}</p>
        <p>Source: {order.orderSource || 'Walk-in'}</p>
      </div>

      <ul className="mt-4 space-y-1 text-sm text-slate-700">
        {(order.items || []).map((item) => (
          <li key={`${order.id}-${item.name}`}>{item.name} x {item.quantity}</li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap gap-2">
        {order.status === 'received' && (
          <button
            type="button"
            onClick={() => onStartPreparing(order.id)}
            disabled={isUpdating}
            className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
          >
            Start Preparing
          </button>
        )}
        {order.status !== 'ready' && (
          <button
            type="button"
            onClick={() => onMarkReady(order.id)}
            disabled={isUpdating}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            Mark Ready
          </button>
        )}
      </div>
    </article>
  )
}

export default OrderCard
