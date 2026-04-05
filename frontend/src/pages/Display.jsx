import { useEffect, useMemo, useState } from 'react'
import { loadOrders, subscribeOrders } from '../orderStore'

function Display() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchOrders = async () => {
      const storedOrders = await loadOrders()
      setOrders(storedOrders)
    }

    fetchOrders()
    const unsubscribe = subscribeOrders((newOrders) => {
      setOrders(newOrders)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== 'waste'),
    [orders],
  )

  const preparingTokens = useMemo(
    () => activeOrders.filter((order) => order.status === 'preparing').map((order) => order.token_number),
    [activeOrders],
  )

  const readyTokens = useMemo(
    () => activeOrders.filter((order) => order.status === 'ready').map((order) => order.token_number),
    [activeOrders],
  )

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.12),_transparent_24%),linear-gradient(180deg,#060b16_0%,#09111f_48%,#0f172a_100%)] px-4 py-6 sm:px-8 sm:py-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_30px_80px_rgba(2,6,23,0.45)] backdrop-blur sm:p-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300">Token Display</p>
            <h1 className="mt-3 text-3xl font-black sm:text-5xl">Please Watch Your Number</h1>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            Live Kitchen Status
          </div>
        </header>

        {error && (
          <p className="mb-5 rounded-xl bg-rose-100 px-4 py-3 text-sm text-rose-700">{error}</p>
        )}

        <section className="mb-6 rounded-[1.75rem] border border-amber-400/20 bg-[linear-gradient(180deg,rgba(251,191,36,0.16),rgba(251,146,60,0.08))] p-5 ring-1 ring-amber-200/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="inline-flex rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-white shadow-[0_10px_24px_rgba(249,115,22,0.35)]">
                Preparing
              </div>
              <p className="mt-2 text-sm text-amber-50/80">Orders currently being prepared in the kitchen.</p>
            </div>
            <div className="rounded-full bg-amber-500 px-4 py-2 text-sm font-black text-slate-950">
              {preparingTokens.length}
            </div>
          </div>

          <div className="mt-5 flex min-h-20 flex-wrap gap-4">
            {preparingTokens.length === 0 ? (
              <div className="rounded-full border border-dashed border-amber-300/30 bg-black/10 px-5 py-3 text-sm font-medium text-amber-50/75">
                No tokens are being prepared right now
              </div>
            ) : (
              preparingTokens.map((token) => (
                <div
                  key={`preparing-${token}`}
                  className="flex h-20 w-20 items-center justify-center rounded-full border border-amber-200/30 bg-[radial-gradient(circle_at_30%_30%,#fde68a_0%,#f59e0b_45%,#c2410c_100%)] text-2xl font-black text-slate-950 shadow-[0_12px_30px_rgba(245,158,11,0.35)] sm:h-24 sm:w-24 sm:text-3xl"
                >
                  {token}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="flex-1 rounded-[2rem] border border-emerald-400/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.18),rgba(5,150,105,0.08))] p-5 ring-1 ring-emerald-200/10 sm:p-8">
          <div className="flex items-center justify-between gap-3 text-white">
            <div>
              <div className="inline-flex rounded-full bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-white shadow-[0_10px_24px_rgba(16,185,129,0.35)]">
                Ready For Pickup
              </div>
              <p className="mt-2 text-base text-emerald-50/85 sm:text-lg">As soon as an order is ready, its token appears here in green.</p>
            </div>
            <div className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950 sm:text-base">
              {readyTokens.length}
            </div>
          </div>

          {activeOrders.length === 0 && !error ? (
            <div className="mt-8 flex h-full min-h-72 items-center justify-center rounded-[1.75rem] border border-dashed border-white/15 bg-slate-950/20 px-6 text-center text-xl font-semibold text-slate-200/80">
              No active tokens right now
            </div>
          ) : readyTokens.length === 0 ? (
            <div className="mt-8 flex h-full min-h-72 items-center justify-center rounded-[1.75rem] border border-dashed border-white/15 bg-slate-950/20 px-6 text-center text-2xl font-black tracking-[0.12em] text-emerald-50/75 sm:text-4xl">
              PLEASE WAIT
            </div>
          ) : (
            <div className="mt-8 grid auto-rows-fr gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {readyTokens.map((token) => (
                <div
                  key={`ready-${token}`}
                  className="flex min-h-56 items-center justify-center rounded-[1.75rem] border border-emerald-200/20 bg-[radial-gradient(circle_at_top,#86efac_0%,#22c55e_38%,#166534_100%)] px-6 py-8 text-center text-[4.5rem] font-black leading-none text-white shadow-[0_25px_70px_rgba(22,163,74,0.35)] sm:min-h-72 sm:text-[6.5rem] xl:text-[7.5rem]"
                >
                  {token}
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default Display
