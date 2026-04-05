import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAdminLoggedIn, loginAsAdmin } from '../auth'

function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (isAdminLoggedIn()) {
      navigate('/admin')
    }
  }, [navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      await loginAsAdmin(password)
      navigate('/admin')
    } catch (loginError) {
      setError(loginError?.message || 'Incorrect password. Please try again.')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-4 py-10 text-white">
      <section className="mx-auto max-w-md rounded-3xl bg-slate-900/90 p-8 shadow-2xl ring-1 ring-white/10">
        <h1 className="text-3xl font-black">Admin Login</h1>
        <p className="mt-3 text-sm text-slate-300">Enter the admin password to edit business category and rates.</p>

        {error && <div className="mt-5 rounded-2xl bg-rose-500/20 px-4 py-3 text-sm text-rose-200">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-200">Admin Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
            placeholder="Enter admin password"
          />
          <button
            type="submit"
            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Continue
          </button>
        </form>

        <p className="mt-5 text-xs text-slate-400">
          The admin password is controlled by the Railway backend environment variables.
        </p>
      </section>
    </main>
  )
}

export default AdminLogin
