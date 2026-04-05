const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function Menu({ items, onAddToCart }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      {items.map((item, index) => (
        <article
          key={item.id ?? `${item.name}-${index}`}
          className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">{item.name}</h3>
          <p className="mt-1 text-sm text-slate-500">Freshly made and served hot.</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-base font-bold text-slate-900">
              {currency.format(item.price)}
            </span>
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              Add to Cart
            </button>
          </div>
        </article>
      ))}
    </section>
  )
}

export default Menu
