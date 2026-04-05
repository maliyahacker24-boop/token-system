import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  loadAdminConfigs,
  saveAdminConfig,
  deleteAdminConfig,
  clearAdminConfigs,
  subscribeAdminConfigs,
} from '../adminStore'

const DEFAULT_ITEM = { name: '', price: '' }
const CATEGORY_OPTIONS = ['Restaurant', 'Healthcare']

function Admin() {
  const [businessType, setBusinessType] = useState('Restaurant')
  const [businessName, setBusinessName] = useState('')
  const [items, setItems] = useState([DEFAULT_ITEM])
  const [savedConfigs, setSavedConfigs] = useState([])
  const [message, setMessage] = useState('')
  const [editId, setEditId] = useState('')

  useEffect(() => {
    const loadConfig = async () => {
      const configs = await loadAdminConfigs()
      setSavedConfigs(configs)
    }

    loadConfig()

    const unsubscribe = subscribeAdminConfigs((configs) => {
      setSavedConfigs(configs)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const resetForm = () => {
    setEditId('')
    setBusinessType('Restaurant')
    setBusinessName('')
    setItems([DEFAULT_ITEM])
  }

  const updateItem = (index, field, value) => {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    )
  }

  const addItem = () => {
    setItems((currentItems) => [...currentItems, DEFAULT_ITEM])
  }

  const removeItem = (index) => {
    setItems((currentItems) => currentItems.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleSave = async () => {
    setMessage('')
    const trimmedName = businessName.trim()
    const validItems = items
      .filter((item) => item.name.trim() !== '' && item.price !== '')
      .map((item) => ({
        id: `${item.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${item.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: item.name.trim(),
        price: Number(item.price),
      }))

    if (!businessType) {
      setMessage('Please select a category: Restaurant or Healthcare.')
      return
    }

    if (!trimmedName) {
      setMessage('Please enter the restaurant or business name.')
      return
    }

    if (validItems.length === 0) {
      setMessage('Add at least one item with a name and price.')
      return
    }

    const { data } = await saveAdminConfig({
      id: editId,
      businessType,
      businessName: trimmedName,
      items: validItems,
    })

    if (!data) {
      setMessage('Save failed. Supabase ya network check karo.')
      return
    }

    const configs = await loadAdminConfigs()
    setSavedConfigs(configs)
    setEditId(data.id)
    setMessage(`Saved configuration for ${trimmedName}. Use the QR on the home screen to open this business.`)
  }

  const handleClear = async () => {
    const { error } = await clearAdminConfigs()
    if (error) {
      setMessage('Clear failed. Supabase ya network check karo.')
      return
    }
    resetForm()
    setSavedConfigs([])
    setMessage('All saved business configurations were cleared.')
  }

  const handleEdit = (config) => {
    setEditId(config.id)
    setBusinessType(config.businessType)
    setBusinessName(config.businessName)
    setItems(config.items.length > 0 ? config.items : [DEFAULT_ITEM])
    setMessage(`Editing ${config.businessName}`)
  }

  const handleDelete = async (configId) => {
    const { error } = await deleteAdminConfig(configId)
    if (error) {
      setMessage('Delete failed. Supabase ya network check karo.')
      return
    }
    const configs = await loadAdminConfigs()
    setSavedConfigs(configs)
    if (editId === configId) {
      resetForm()
    }
    setMessage('Removed saved business configuration.')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-amber-100 px-4 py-10">
      <section className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Admin Setup</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Business Category and Menu</h1>
          <p className="mt-2 text-sm text-slate-600">
            Save your business category and restaurant name. Then use the home screen to choose the QR for the correct business.
          </p>
        </header>

        {message && (
          <div className="mb-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Category</label>
            <select
              value={businessType}
              onChange={(event) => setBusinessType(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Business / Restaurant Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Enter restaurant name"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            />
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Item Rates</h2>
            <button
              type="button"
              onClick={addItem}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Add Item
            </button>
          </div>

          {items.map((item, index) => (
            <div key={`${item.name}-${index}`} className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1.3fr_0.9fr_0.5fr]">
              <input
                type="text"
                placeholder="Item name e.g. Momos"
                value={item.name}
                onChange={(event) => updateItem(index, 'name', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
              />
              <input
                type="number"
                placeholder="Price"
                min="0"
                value={item.price}
                onChange={(event) => updateItem(index, 'price', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-3xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Save Configuration
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-3xl bg-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300"
          >
            Clear All Businesses
          </button>
        </div>

        {savedConfigs.length > 0 && (
          <div className="mt-12 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Saved Businesses</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {savedConfigs.map((config) => (
                <div key={config.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm uppercase tracking-[0.16em] text-slate-500">{config.businessType}</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{config.businessName}</h3>
                  <p className="mt-2 text-sm text-slate-600">{config.items.length} menu item(s)</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={`/menu?biz=${config.id}`}
                      className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Open Page
                    </a>
                    <button
                      type="button"
                      onClick={() => handleEdit(config)}
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(config.id)}
                      className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default Admin
