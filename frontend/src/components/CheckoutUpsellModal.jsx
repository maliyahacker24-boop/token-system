const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function CheckoutUpsellModal({ isOpen, drinks, onAddDrink, onClose, onSkipCheckout, onContinue, isPlacingOrder }) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-[2rem] bg-white p-6 shadow-[0_35px_120px_rgba(15,23,42,0.45)] ring-1 ring-slate-200 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">Checkout Add-On</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Add a chilled soft drink?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Before you place the order, offer the customer a cold drink with the meal. Tap any card below to add it instantly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Skip
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {drinks.map((drink) => (
            <button
              key={drink.id}
              type="button"
              onClick={() => onAddDrink(drink)}
              className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 text-left transition hover:-translate-y-1 hover:border-emerald-200 hover:bg-white hover:shadow-lg"
            >
              <div className={`relative flex h-44 items-center justify-center overflow-hidden ${drink.imageBackground}`}>
                <img
                  src={drink.image}
                  alt={drink.name}
                  title={drink.name}
                  className="h-32 w-auto drop-shadow-[0_16px_18px_rgba(15,23,42,0.28)] transition group-hover:scale-105"
                />
                <div className="absolute inset-x-4 bottom-4 rounded-full bg-white/85 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 backdrop-blur">
                  {drink.badge}
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-slate-900">{drink.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{drink.description}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                    {currency.format(drink.price)}
                  </span>
                </div>
                <div className="mt-5 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-emerald-600">
                  Add to Cart
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onSkipCheckout}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            No Drinks, Continue
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={isPlacingOrder}
            className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {isPlacingOrder ? 'Placing Order...' : 'Continue to Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CheckoutUpsellModal