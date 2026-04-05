import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { loadAdminConfigs, subscribeAdminConfigs } from '../adminStore'

function Home() {
  const [businesses, setBusinesses] = useState([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const loadBusinesses = async () => {
      const configs = await loadAdminConfigs()
      setBusinesses(configs)
      if (configs.length > 0) {
        setSelectedBusinessId(configs[0].id)
      }
    }

    loadBusinesses()

    const unsubscribe = subscribeAdminConfigs((configs) => {
      setBusinesses(configs)
      setSelectedBusinessId((currentId) => {
        if (configs.some((business) => business.id === currentId)) {
          return currentId
        }

        return configs[0]?.id || ''
      })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId)
  const menuUrl = selectedBusiness
    ? `${window.location.origin}/menu?biz=${selectedBusiness.id}`
    : `${window.location.origin}/menu`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_30%),linear-gradient(135deg,#fff7ed_0%,#f8fafc_52%,#ecfdf5_100%)] px-4 py-8">
      <section className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] bg-white p-8 shadow-xl ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600">Restro Token System</p>
          <h1 className="mt-3 text-4xl font-black text-slate-900 sm:text-5xl">One system, five screens</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            This setup supports multiple device roles: customer touch ordering, a waiter add-on app, a kitchen queue screen, an outside pickup token display, and an owner command center.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                title: 'Customer Touch Screen',
                copy: 'Customers can place orders directly from a counter tablet or touch display.',
                to: '/kiosk',
                tone: 'bg-slate-900 text-white',
              },
              {
                title: 'Waiter Add-on App',
                copy: 'Add repeat items or extras to the same token from the waiter workflow.',
                to: '/waiter',
                tone: 'bg-amber-500 text-white',
              },
              {
                title: 'Kitchen Screen',
                copy: 'Track received and preparing orders in one live kitchen queue.',
                to: '/kitchen',
                tone: 'bg-white text-slate-900 ring-1 ring-slate-200',
              },
              {
                title: 'Outside Token LED',
                copy: 'Show ready pickup tokens clearly for takeaway customers.',
                to: '/display',
                tone: 'bg-emerald-600 text-white',
              },
              {
                title: 'Owner Dashboard',
                copy: 'Manage live orders, control links, analytics, and menu setup from one place.',
                to: '/dashboard',
                tone: 'bg-slate-700 text-white',
              },
              {
                title: 'Menu Setup',
                copy: 'Configure business names, menu items, and pricing here.',
                to: '/admin',
                tone: 'bg-white text-slate-900 ring-1 ring-slate-200',
              },
            ].map((item) => (
              <Link
                key={item.title}
                to={item.to}
                className={`rounded-[1.75rem] p-5 shadow-sm transition hover:-translate-y-1 ${item.tone}`}
              >
                <p className="text-lg font-black">{item.title}</p>
                <p className="mt-3 text-sm leading-6 opacity-90">{item.copy}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-8 shadow-xl ring-1 ring-slate-200">
          <h2 className="text-2xl font-black text-slate-900">Customer QR / Kiosk Link</h2>
          <p className="mt-2 text-sm text-slate-600">Scan the QR code to open the customer menu for the selected business.</p>

          {businesses.length > 0 ? (
            <div className="mt-6 space-y-4 rounded-3xl bg-slate-50 p-5">
              <label className="block text-sm font-semibold text-slate-700">Choose business QR</label>
              <select
                value={selectedBusinessId}
                onChange={(event) => setSelectedBusinessId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
              >
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.businessName} ({business.businessType})
                  </option>
                ))}
              </select>

              <div className="flex justify-center rounded-2xl bg-white p-5">
                <QRCodeSVG value={menuUrl} size={220} />
              </div>

              <p className="break-all rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">{menuUrl}</p>
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700"
              >
                {copied ? 'Link copied!' : 'Copy QR link'}
              </button>
            </div>
          ) : (
            <div className="mt-6 flex justify-center rounded-2xl bg-slate-50 p-5">
              <QRCodeSVG value={menuUrl} size={220} />
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link to="/menu" className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-700">
              Customer Menu
            </Link>
            <Link to="/kiosk" className="rounded-xl bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-amber-600">
              Touch Kiosk
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link to="/dashboard" className="rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700">
              Owner Dashboard
            </Link>
            <Link to="/admin/login" className="rounded-xl bg-slate-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-400">
              Admin Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Home
