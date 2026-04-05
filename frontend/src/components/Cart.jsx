const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function Cart({
  cartItems,
  totalPrice,
  onIncrement,
  onDecrement,
  onPlaceOrder,
  isPlacingOrder,
  businessName,
  serviceLabel,
  paymentMethod,
  orderSource,
}) {
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  if (cartItems.length === 0) {
    return (
      <section className="rounded-[2rem] bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.28)] xl:sticky xl:top-5">
        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Current Order</p>
          <h2 className="mt-3 text-2xl font-black">Ready for checkout</h2>
          <p className="mt-2 text-sm leading-7 text-slate-300">Tap items from the menu board to build the customer's order.</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[1.25rem] bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Restaurant</p>
              <p className="mt-2 text-sm font-bold text-white">{businessName || 'Customer Menu'}</p>
            </div>
            <div className="rounded-[1.25rem] bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Service</p>
              <p className="mt-2 text-sm font-bold text-white">{serviceLabel}</p>
            </div>
            <div className="rounded-[1.25rem] bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Payment</p>
              <p className="mt-2 text-sm font-bold text-white">{paymentMethod}</p>
            </div>
            <div className="rounded-[1.25rem] bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Source</p>
              <p className="mt-2 text-sm font-bold text-white">{orderSource}</p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.4rem] border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300">
            Your cart is empty. Add items from the menu to place an order.
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-[2rem] bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.28)] xl:sticky xl:top-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Current Order</p>
          <h2 className="mt-3 text-2xl font-black">Your Cart</h2>
          <p className="mt-2 text-sm text-slate-300">{businessName || 'Customer Menu'} • {serviceLabel}</p>
        </div>
        <div className="rounded-[1.25rem] bg-white/10 px-4 py-3 text-center ring-1 ring-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Items</p>
          <p className="mt-2 text-2xl font-black text-white">{totalQuantity}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-[1.2rem] bg-white/10 px-4 py-3 ring-1 ring-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Payment</p>
          <p className="mt-2 font-bold text-white">{paymentMethod}</p>
        </div>
        <div className="rounded-[1.2rem] bg-white/10 px-4 py-3 ring-1 ring-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Source</p>
          <p className="mt-2 font-bold text-white">{orderSource}</p>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {cartItems.map((item) => (
          <li key={item.id} className="rounded-[1.3rem] bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-white">{item.name}</p>
                <p className="mt-1 text-xs text-slate-300">{currency.format(item.price)} each</p>
              </div>
              <p className="text-sm font-bold text-amber-300">{currency.format(item.price * item.quantity)}</p>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Qty</span>
              <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onDecrement(item.id)}
                className="h-10 w-10 rounded-xl bg-white/10 text-lg font-semibold text-white transition hover:bg-white/20"
              >
                -
              </button>
              <span className="w-8 text-center text-lg font-black text-white">{item.quantity}</span>
              <button
                type="button"
                onClick={() => onIncrement(item.id)}
                className="h-10 w-10 rounded-xl bg-amber-400 text-lg font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                +
              </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-[1.5rem] bg-[linear-gradient(135deg,#fde68a_0%,#facc15_50%,#f59e0b_100%)] p-5 text-slate-950 shadow-[0_14px_30px_rgba(250,204,21,0.28)]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">Grand Total</span>
          <span className="text-3xl font-black">{currency.format(totalPrice)}</span>
        </div>
        <p className="mt-2 text-sm text-slate-700">Review the order once, then continue to checkout.</p>
      </div>

      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={isPlacingOrder}
        className="mt-5 w-full rounded-[1.25rem] bg-emerald-500 px-4 py-4 text-base font-black text-white shadow-[0_10px_24px_rgba(16,185,129,0.35)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-300"
      >
        {isPlacingOrder ? 'Placing Order...' : 'Proceed to Checkout'}
      </button>
    </section>
  )
}

export default Cart
