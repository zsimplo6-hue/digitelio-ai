export default function DashboardMockup() {
  return (
    <section id="apercu" className="py-16 px-5 bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_260px] gap-4 max-w-5xl mx-auto
                      bg-white/55 backdrop-blur-2xl border border-white/60 rounded-3xl
                      shadow-[0_20px_50px_rgba(79,70,229,0.15)] p-5">

        {/* Sidebar */}
        <aside className="bg-white/40 rounded-2xl p-4">
          <nav className="flex md:flex-col gap-2 overflow-x-auto">
            <a className="whitespace-nowrap px-3 py-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm font-medium">
              📘 eBooks
            </a>
            <a className="whitespace-nowrap px-3 py-2.5 rounded-xl text-indigo-700 text-sm">🎓 Formations</a>
            <a className="whitespace-nowrap px-3 py-2.5 rounded-xl text-indigo-700 text-sm">🛒 Pages de vente</a>
            <a className="whitespace-nowrap px-3 py-2.5 rounded-xl text-indigo-700 text-sm">🖼️ Images IA</a>
          </nav>
        </aside>

        {/* Editeur central */}
        <main className="bg-white/50 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-800">Guide Marketing Digital</h3>
          <div className="flex gap-4 mt-4">
            <div className="w-[100px] h-[140px] rounded-xl bg-gradient-to-br from-indigo-950 to-indigo-900 shadow-lg shrink-0" />
            <div className="flex-1 flex flex-col gap-2.5 mt-1.5">
              <span className="block h-2.5 rounded-md bg-indigo-500/20" />
              <span className="block h-2.5 rounded-md bg-indigo-500/20" />
              <span className="block h-2.5 rounded-md bg-indigo-500/20 w-[70%]" />
            </div>
          </div>
        </main>

        {/* Panneau IA */}
        <aside className="bg-white/50 rounded-2xl p-4 flex flex-col gap-2.5">
          <h4 className="font-semibold text-slate-800">✨ Assistant IA</h4>
          <textarea
            placeholder="Décrivez ce que vous voulez générer..."
            className="min-h-[90px] rounded-xl border border-indigo-500/25 bg-white/70 p-2.5 resize-none text-sm"
          />
          <button className="py-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-semibold transition-transform hover:-translate-y-0.5">
            Générer
          </button>
        </aside>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-4 justify-center mt-6">
        {[
          ['2 547', 'Produits créés'],
          ['98%', 'Satisfaction client'],
          ['12s', 'Temps de génération'],
        ].map(([value, label]) => (
          <div key={label} className="bg-white/60 backdrop-blur-md rounded-2xl px-6 py-4 text-center shadow-[0_10px_24px_rgba(79,70,229,0.12)]">
            <strong className="block text-xl text-indigo-700">{value}</strong>
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
        }
