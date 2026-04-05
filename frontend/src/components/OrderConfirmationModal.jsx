const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function OrderConfirmationModal({
  isOpen,
  cartItems,
  customerName,
  serviceLabel,
  orderSource,
  subtotal,
  gstAmount,
  finalTotal,
  gstRateLabel,
  onBack,
  onConfirmCash,
  onConfirmOnline,
  isPlacingOrder,
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="kiosk-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 px-4 py-8 backdrop-blur-sm">
      <div className="kiosk-panel-rise w-full max-w-6xl rounded-[2rem] bg-white p-6 shadow-[0_35px_120px_rgba(15,23,42,0.45)] ring-1 ring-slate-200 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">Final Confirmation</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Review this order before printing</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Check all selected items, confirm the GST breakdown, then choose Cash or Online to print the bill with the correct payment mode.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Back
          </button>
        </div>

        <div className="mt-8 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Selected Items</p>
                <p className="mt-2 text-sm text-slate-600">Service: {serviceLabel} • Source: {orderSource}</p>
                {customerName && <p className="mt-1 text-sm font-semibold text-slate-800">Customer: {customerName}</p>}
              </div>
              <span className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)} item(s)
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
              <div className="grid grid-cols-[1.4fr_0.6fr_0.7fr_0.7fr] gap-3 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span>Item</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Price</span>
                <span className="text-right">Total</span>
              </div>
              <div className="max-h-[22rem] divide-y divide-slate-200 overflow-y-auto bg-white">
                {cartItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1.4fr_0.6fr_0.7fr_0.7fr] gap-3 px-4 py-4 text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">{item.name}</span>
                    <span className="text-right">{item.quantity}</span>
                    <span className="text-right">{currency.format(item.price)}</span>
                    <span className="text-right font-semibold text-slate-900">{currency.format(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="rounded-[1.75rem] bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.28)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Bill Summary</p>

            <div className="mt-5 space-y-3 rounded-[1.4rem] bg-white/5 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Subtotal</span>
                <span className="font-semibold text-white">{currency.format(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>GST ({gstRateLabel})</span>
                <span className="font-semibold text-white">{currency.format(gstAmount)}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between text-base font-black text-white">
                <span>Payable Total</span>
                <span>{currency.format(finalTotal)}</span>
              </div>
            </div>

            <div className="mt-5 rounded-[1.4rem] bg-white/5 p-4 ring-1 ring-white/10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Print Options</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Choose the payment button below. The bill will be placed and printed with the selected payment mode.
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={onConfirmCash}
                disabled={isPlacingOrder}
                className="rounded-[1.2rem] bg-[linear-gradient(135deg,#fde68a_0%,#facc15_55%,#f59e0b_100%)] px-5 py-4 text-base font-black text-slate-950 shadow-[0_14px_34px_rgba(250,204,21,0.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPlacingOrder ? 'Printing Cash Bill...' : 'Cash • Print Bill'}
              </button>
              <button
                type="button"
                onClick={onConfirmOnline}
                disabled={isPlacingOrder}
                className="rounded-[1.2rem] bg-emerald-500 px-5 py-4 text-base font-black text-white shadow-[0_14px_30px_rgba(16,185,129,0.3)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPlacingOrder ? 'Printing Online Bill...' : 'Online • Print Bill'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default OrderConfirmationModal