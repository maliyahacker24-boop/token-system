import { useMemo } from 'react'

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
]

function CustomerNameModal({ isOpen, value, onAppend, onBackspace, onClear, onClose, onConfirm }) {
  const trimmedValue = useMemo(() => value.trim(), [value])

  if (!isOpen) {
    return null
  }

  return (
    <div className="kiosk-fade-in fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 px-4 py-8 backdrop-blur-sm">
      <div className="kiosk-panel-rise w-full max-w-4xl rounded-[2rem] bg-white p-6 shadow-[0_35px_120px_rgba(15,23,42,0.45)] ring-1 ring-slate-200 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">Eat In Details</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Enter your name</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Tap the letters below to type the customer name. This name will be shown on the order confirmation and printed bill.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>

        <div className="mt-8 rounded-[1.7rem] border border-slate-200 bg-slate-50 p-5 shadow-inner shadow-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Customer Name</p>
          <div className="mt-3 min-h-[88px] rounded-[1.35rem] border border-slate-200 bg-white px-5 py-5 text-3xl font-black text-slate-900 shadow-sm">
            {trimmedValue || <span className="text-xl font-semibold text-slate-300">Tap letters to type here</span>}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {KEYBOARD_ROWS.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex flex-wrap justify-center gap-3">
              {row.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onAppend(key)}
                  className="min-w-[64px] rounded-[1.1rem] bg-slate-900 px-4 py-4 text-lg font-black text-white shadow-sm transition hover:bg-slate-700"
                >
                  {key}
                </button>
              ))}
            </div>
          ))}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onAppend(' ')}
              className="rounded-[1.1rem] bg-slate-200 px-8 py-4 text-base font-black text-slate-800 transition hover:bg-slate-300"
            >
              Space
            </button>
            <button
              type="button"
              onClick={onBackspace}
              className="rounded-[1.1rem] bg-amber-400 px-8 py-4 text-base font-black text-slate-950 transition hover:bg-amber-300"
            >
              Backspace
            </button>
            <button
              type="button"
              onClick={onClear}
              className="rounded-[1.1rem] bg-rose-500 px-8 py-4 text-base font-black text-white transition hover:bg-rose-600"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[1.2rem] border border-slate-200 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!trimmedValue}
            className="rounded-[1.2rem] bg-emerald-600 px-6 py-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            Continue With Eat In
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomerNameModal