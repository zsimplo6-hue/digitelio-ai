import DashboardLayout from "../components/DashboardLayout.jsx";

export default function ComingSoon({ title, icon, text }) {
  return (
    <DashboardLayout>
      <div className="cs-page">
        <div className="cs-icon">{icon}</div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="cs-badge">Bientôt disponible</div>
        <p className="cs-text">{text}</p>
      </div>

      <style>{`
        .cs-page { max-width: 30rem; margin: 3rem auto 0; text-align: center; }
        .cs-icon { font-size: 3rem; margin-bottom: 0.6rem; }
        .cs-badge {
          display: inline-block; margin: 0.8rem 0; padding: 0.3rem 0.9rem; border-radius: 999px;
          font-size: 0.78rem; font-weight: 700; color: #0B0B0B; background: #D4AF37;
        }
        .cs-text { opacity: 0.75; line-height: 1.7; }
      `}</style>
    </DashboardLayout>
  );
}
