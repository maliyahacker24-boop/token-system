function TokenDisplay({ title, tokens, accentClass, emptyText = 'No tokens' }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
      <h2 className={`text-2xl font-black uppercase tracking-wide ${accentClass}`}>{title}</h2>
      <div className="mt-5 min-h-40 rounded-2xl bg-slate-100 p-4">
        {tokens.length === 0 ? (
          <p className="text-lg font-semibold text-slate-400">{emptyText}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tokens.map((token) => (
              <div
                key={token}
                className="rounded-2xl bg-slate-900 px-3 py-5 text-center text-4xl font-black text-white sm:text-5xl"
              >
                {token}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default TokenDisplay
