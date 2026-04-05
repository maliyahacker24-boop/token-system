import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured } from '../supabaseClient'
import { loadOrders } from '../orderStore'

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const queryExamples = `-- Total orders by date
SELECT DATE(created_at) AS order_date, COUNT(*)
FROM orders
GROUP BY order_date
ORDER BY order_date DESC;

-- Cash vs prepaid orders
SELECT "paymentMethod", COUNT(*)
FROM orders
GROUP BY "paymentMethod";

-- Dine In vs Take Away counts
SELECT "serviceType", COUNT(*)
FROM orders
GROUP BY "serviceType";

-- Order source counts
SELECT "orderSource", COUNT(*)
FROM orders
GROUP BY "orderSource";

-- Waste orders and wasted items
SELECT COUNT(*) AS waste_orders
FROM orders
WHERE status = 'waste';

SELECT item->>'name' AS item_name,
       SUM((item->>'quantity')::int) AS wasted_quantity
FROM orders,
     jsonb_array_elements(items) AS item
WHERE status = 'waste'
GROUP BY item_name
ORDER BY wasted_quantity DESC;

-- Best selling item
SELECT item->>'name' AS item_name,
       SUM((item->>'quantity')::int) AS total_sold
FROM orders,
     jsonb_array_elements(items) AS item
GROUP BY item_name
ORDER BY total_sold DESC
LIMIT 1;

-- Filter by restaurant name (example: sardar ji chapp)
SELECT *
FROM orders
WHERE "businessName" ILIKE '%sardar ji chapp%';`

function Analytics() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const data = await loadOrders()
      setOrders(data)
      setIsLoading(false)
    }

    loadData()
  }, [])

  const filteredOrders = useMemo(() => {
    const query = filter.trim().toLowerCase()
    if (!query) return orders
    return orders.filter(
      (order) =>
        order.businessName?.toLowerCase().includes(query) ||
        order.businessId?.toLowerCase().includes(query),
    )
  }, [orders, filter])

  const summary = useMemo(() => {
    const counts = {
      total: filteredOrders.length,
      cash: 0,
      prepaid: 0,
      dineIn: 0,
      takeAway: 0,
      waste: 0,
      sources: {},
      itemSales: {},
      wastedItems: {},
      daily: {},
    }

    filteredOrders.forEach((order) => {
      const source = order.orderSource || 'Walk-in'
      const method = order.paymentMethod || 'Cash'
      const service = order.serviceType || 'Unknown'
      const date = new Date(order.created_at).toLocaleDateString('en-IN')

      counts.cash += method === 'Cash' ? 1 : 0
      counts.prepaid += method === 'Prepaid' ? 1 : 0
      counts.dineIn += service === 'Dine In' ? 1 : 0
      counts.takeAway += service === 'Take Away' ? 1 : 0
      counts.waste += order.status === 'waste' ? 1 : 0
      counts.sources[source] = (counts.sources[source] || 0) + 1
      counts.daily[date] = (counts.daily[date] || 0) + 1

      ;(order.items || []).forEach((item) => {
        const name = item.name || 'Unknown'
        const qty = Number(item.quantity) || 0
        counts.itemSales[name] = (counts.itemSales[name] || 0) + qty
        if (order.status === 'waste') {
          counts.wastedItems[name] = (counts.wastedItems[name] || 0) + qty
        }
      })
    })

    const sortedItems = Object.entries(counts.itemSales).sort((a, b) => b[1] - a[1])
    const sortedWaste = Object.entries(counts.wastedItems).sort((a, b) => b[1] - a[1])
    const dailyData = Object.entries(counts.daily)
      .sort(([a], [b]) => new Date(b) - new Date(a))
      .slice(0, 7)

    return {
      ...counts,
      bestSelling: sortedItems[0] || ['N/A', 0],
      lowestSelling: sortedItems[sortedItems.length - 1] || ['N/A', 0],
      wastedItemsList: sortedWaste,
      dailyData,
    }
  }, [filteredOrders])

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Analytics</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">Restaurant Performance Dashboard</h1>
              <p className="mt-2 text-sm text-slate-600">View order, payment, service, waste, and item analytics for one restaurant or all restaurants.</p>
            </div>
            <Link
              to="/admin"
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Back to Admin
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-[1.5fr_1fr]">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Search restaurant</label>
              <input
                type="text"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Search by restaurant name or business id"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
              />
              <p className="mt-2 text-xs text-slate-500">Leave blank to show data for all restaurants.</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Totals</p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-3xl bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Total Orders</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{summary.total}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-3xl bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Cash Orders</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{summary.cash}</p>
                  </div>
                  <div className="rounded-3xl bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Prepaid Orders</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{summary.prepaid}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.85fr]">
          <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Performance Metrics</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[
                { label: 'Dine In', value: summary.dineIn },
                { label: 'Take Away', value: summary.takeAway },
                { label: 'Waste Orders', value: summary.waste },
                { label: 'Best Seller', value: `${summary.bestSelling[0]} (${summary.bestSelling[1]})` },
                { label: 'Lowest Seller', value: `${summary.lowestSelling[0]} (${summary.lowestSelling[1]})` },
              ].map((card) => (
                <div key={card.label} className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">{card.label}</p>
                  <p className="mt-3 text-xl font-black text-slate-900">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Order sources</p>
                <div className="mt-4 space-y-2">
                  {Object.entries(summary.sources).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between text-sm text-slate-700">
                      <span>{source}</span>
                      <span className="font-semibold text-slate-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Daily orders</p>
                <div className="mt-4 space-y-2">
                  {summary.dailyData.length === 0 ? (
                    <p className="text-sm text-slate-500">No daily order data yet.</p>
                  ) : (
                    summary.dailyData.map(([day, count]) => (
                      <div key={day} className="flex items-center justify-between text-sm text-slate-700">
                        <span>{day}</span>
                        <span className="font-semibold text-slate-900">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Waste Analysis</h2>
            {summary.wastedItemsList.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No wasted items recorded yet.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {summary.wastedItemsList.map(([item, qty]) => (
                  <div key={item} className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">{item}</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{qty}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Best & Worst Selling Items</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Best seller</p>
                <p className="mt-3 text-2xl font-black text-slate-900">{summary.bestSelling[0]}</p>
                <p className="text-sm text-slate-600">Qty: {summary.bestSelling[1]}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Lowest seller</p>
                <p className="mt-3 text-2xl font-black text-slate-900">{summary.lowestSelling[0]}</p>
                <p className="text-sm text-slate-600">Qty: {summary.lowestSelling[1]}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Supabase Queries</h2>
            {isSupabaseConfigured ? (
              <pre className="mt-6 max-h-[400px] overflow-auto rounded-3xl bg-slate-950 p-4 text-xs leading-6 text-emerald-100">
                {queryExamples}
              </pre>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Supabase is not configured. Local order data is shown instead.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default Analytics
