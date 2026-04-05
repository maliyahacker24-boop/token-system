const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function Cart({ cartItems, totalPrice, onIncrement, onDecrement, onPlaceOrder, isPlacingOrder }) {
  if (cartItems.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        Your cart is empty. Add items from the menu to place an order.
      </div>
    )
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-bold text-slate-800">Your Cart</h2>
      <ul className="mt-4 space-y-3">
        {cartItems.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
            <div>
              <p className="font-medium text-slate-800">{item.name}</p>
              <p className="text-xs text-slate-500">{currency.format(item.price)} each</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onDecrement(item.id)}
                className="h-8 w-8 rounded-lg bg-slate-200 text-lg font-semibold text-slate-700 hover:bg-slate-300"
              >
                -
              </button>
              <span className="w-6 text-center font-semibold text-slate-800">{item.quantity}</span>
              <button
                type="button"
                onClick={() => onIncrement(item.id)}
                className="h-8 w-8 rounded-lg bg-slate-200 text-lg font-semibold text-slate-700 hover:bg-slate-300"
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
        <span className="text-sm font-medium text-slate-600">Total</span>
        <span className="text-xl font-bold text-slate-900">{currency.format(totalPrice)}</span>
      </div>
      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={isPlacingOrder}
        className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
      >
        {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
      </button>
    </section>
  )
}

export default Cart
