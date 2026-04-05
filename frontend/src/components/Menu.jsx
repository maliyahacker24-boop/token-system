import { useEffect, useMemo, useState } from 'react'

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const CATEGORY_PRESETS = [
  {
    key: 'all',
    label: 'All Items',
    description: 'Browse the full menu',
    matcher: () => true,
    palette: { surface: 'from-slate-100 via-white to-slate-50', accent: '#0f172a', bubble: '#facc15' },
  },
  {
    key: 'wraps',
    label: 'Wraps & Rolls',
    description: 'Rolls, wraps and loaded handhelds',
    matcher: (name) => /wrap|roll|frankie|kathi/i.test(name),
    palette: { surface: 'from-amber-100 via-orange-50 to-yellow-50', accent: '#c2410c', bubble: '#fb923c' },
  },
  {
    key: 'burgers',
    label: 'Burgers',
    description: 'Stacked, grilled and filling',
    matcher: (name) => /burger|slider/i.test(name),
    palette: { surface: 'from-emerald-100 via-lime-50 to-white', accent: '#166534', bubble: '#4ade80' },
  },
  {
    key: 'drinks',
    label: 'Cold Drinks',
    description: 'Chilled add-ons and refreshers',
    matcher: (name) => /drink|cola|sprite|fanta|thums|juice|shake|lassi|coffee|tea|water/i.test(name),
    palette: { surface: 'from-sky-100 via-cyan-50 to-white', accent: '#0369a1', bubble: '#38bdf8' },
  },
  {
    key: 'noodles',
    label: 'Noodles & Momos',
    description: 'Wok bowls and fast bites',
    matcher: (name) => /chow|noodle|pasta|momo/i.test(name),
    palette: { surface: 'from-rose-100 via-orange-50 to-white', accent: '#be123c', bubble: '#fb7185' },
  },
  {
    key: 'snacks',
    label: 'Quick Bites',
    description: 'Fast favorites for any time',
    matcher: () => true,
    palette: { surface: 'from-violet-100 via-fuchsia-50 to-white', accent: '#6d28d9', bubble: '#a78bfa' },
  },
]

const getCategoryForItem = (itemName) =>
  CATEGORY_PRESETS.slice(1).find((category) => category.matcher(itemName)) || CATEGORY_PRESETS[CATEGORY_PRESETS.length - 1]

const createItemArtwork = (itemName, accentColor, bubbleColor) => {
  const label = `${itemName || 'Item'}`.trim().slice(0, 12)
  const shortLabel = label.length > 8 ? `${label.slice(0, 8)}.` : label
  const firstLetter = label.charAt(0).toUpperCase() || 'I'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 220" role="img" aria-label="${label}">
      <rect width="240" height="220" rx="36" fill="url(#g)" />
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#f8fafc" stop-opacity="0.9" />
        </linearGradient>
      </defs>
      <circle cx="52" cy="46" r="18" fill="${bubbleColor}" fill-opacity="0.38" />
      <circle cx="192" cy="58" r="12" fill="${bubbleColor}" fill-opacity="0.24" />
      <circle cx="178" cy="160" r="20" fill="${bubbleColor}" fill-opacity="0.18" />
      <rect x="44" y="38" width="152" height="144" rx="30" fill="${accentColor}" fill-opacity="0.12" />
      <circle cx="120" cy="102" r="44" fill="${accentColor}" fill-opacity="0.14" />
      <text x="120" y="116" text-anchor="middle" font-size="54" font-family="Arial, sans-serif" font-weight="700" fill="${accentColor}">${firstLetter}</text>
      <text x="120" y="172" text-anchor="middle" font-size="16" font-family="Arial, sans-serif" font-weight="700" fill="${accentColor}">${shortLabel}</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function Menu({ items, onAddToCart, businessName }) {
  const [activeCategoryKey, setActiveCategoryKey] = useState('all')

  const decoratedItems = useMemo(
    () =>
      items.map((item) => {
        const category = getCategoryForItem(item.name)
        const image = createItemArtwork(item.name, category.palette.accent, category.palette.bubble)

        return {
          ...item,
          categoryKey: category.key,
          categoryLabel: category.label,
          categoryDescription: category.description,
          palette: category.palette,
          image,
        }
      }),
    [items],
  )

  const availableCategories = useMemo(() => {
    const counts = new Map([['all', decoratedItems.length]])

    decoratedItems.forEach((item) => {
      counts.set(item.categoryKey, (counts.get(item.categoryKey) || 0) + 1)
    })

    return CATEGORY_PRESETS.filter((category) => counts.has(category.key)).map((category) => ({
      ...category,
      count: counts.get(category.key) || 0,
    }))
  }, [decoratedItems])

  useEffect(() => {
    if (!availableCategories.some((category) => category.key === activeCategoryKey)) {
      setActiveCategoryKey('all')
    }
  }, [activeCategoryKey, availableCategories])

  const activeCategory =
    availableCategories.find((category) => category.key === activeCategoryKey) || availableCategories[0]

  const filteredItems = useMemo(() => {
    if (activeCategoryKey === 'all') {
      return decoratedItems
    }

    return decoratedItems.filter((item) => item.categoryKey === activeCategoryKey)
  }, [activeCategoryKey, decoratedItems])

  if (decoratedItems.length === 0) {
    return (
      <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-500 shadow-sm backdrop-blur">
        No menu items are available yet for {businessName || 'this business'}.
      </section>
    )
  }

  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/85 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 backdrop-blur sm:p-5">
      <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#111827_0%,#0f172a_50%,#1d4ed8_100%)] p-5 text-white shadow-[0_18px_60px_rgba(15,23,42,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-200">Ordering Screen</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">{activeCategory?.label || 'All Items'}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-200">
              {activeCategory?.description || 'Tap any card to add it instantly to the order.'}
            </p>
          </div>
          <div className="grid min-w-[180px] grid-cols-2 gap-3 text-center">
            <div className="rounded-[1.25rem] bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Items</p>
              <p className="mt-2 text-3xl font-black text-white">{filteredItems.length}</p>
            </div>
            <div className="rounded-[1.25rem] bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Ready To Tap</p>
              <p className="mt-2 text-3xl font-black text-white">{decoratedItems.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="rounded-[1.75rem] bg-[linear-gradient(180deg,#fff7ed_0%,#fffbeb_100%)] p-4 ring-1 ring-amber-100">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Categories</p>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1 xl:block xl:space-y-3 xl:overflow-visible">
            {availableCategories.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => setActiveCategoryKey(category.key)}
                className={`min-w-[190px] rounded-[1.35rem] px-4 py-4 text-left transition xl:min-w-0 xl:w-full ${activeCategoryKey === category.key ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-900 ring-1 ring-amber-100 hover:bg-amber-50'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">{category.label}</p>
                    <p className={`mt-1 text-xs leading-5 ${activeCategoryKey === category.key ? 'text-slate-300' : 'text-slate-500'}`}>
                      {category.description}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${activeCategoryKey === category.key ? 'bg-white/10 text-white' : 'bg-amber-100 text-amber-700'}`}>
                    {category.count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Menu Board</p>
              <p className="mt-2 text-sm text-slate-600">Touch any item card to add it to the order.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
              {businessName || 'Customer Menu'}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {filteredItems.map((item, index) => (
              <article
                key={item.id ?? `${item.name}-${index}`}
                className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-amber-200 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
              >
                <div className={`bg-gradient-to-br ${item.palette.surface} p-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-700 ring-1 ring-white/70">
                      {item.categoryLabel}
                    </span>
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white shadow-sm">
                      {currency.format(item.price)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-center rounded-[1.5rem] bg-white/60 p-4 shadow-inner shadow-white/50">
                    <img
                      src={item.image}
                      alt={item.name}
                      title={item.name}
                      className="h-36 w-auto drop-shadow-[0_16px_20px_rgba(15,23,42,0.18)] transition duration-300 group-hover:scale-105"
                    />
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-xl font-black text-slate-900">{item.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.categoryDescription}. Freshly prepared for quick customer ordering.</p>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Price</p>
                      <p className="mt-1 text-2xl font-black text-slate-900">{currency.format(item.price)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAddToCart(item)}
                      className="rounded-[1.1rem] bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_8px_20px_rgba(250,204,21,0.35)] transition hover:bg-amber-300"
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Menu
