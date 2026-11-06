/* Bloc d'accueil premium commun à toutes les pages du tableau de bord */
export default function PageHero({ kicker, title, subtitle, back, children, stats }) {
  return (
    <section className="eb-hero pg-hero">
      {back && <div className="pg-back">{back}</div>}
      {kicker && <div className="eb-kicker">{kicker}</div>}
      <h1 className="eb-hero-title">{title}</h1>
      {subtitle && <p className="eb-hero-sub">{subtitle}</p>}
      {stats && stats.length > 0 && (
        <div className="eb-stats">
          {stats.map((s, i) => (
            <span key={i}>
              <b>{s[0]}</b> {s[1]}
            </span>
          ))}
        </div>
      )}
      {children}
    </section>
  );
}
