export function Card({ icon, title, subtitle, action, children, className = "" }) {
  return (
    <div className={`dg-card ${className}`}>
      {(title || action) && (
        <div className="dg-card__header">
          <div className="dg-card__heading">
            {icon && <div className="dg-card__icon">{icon}</div>}
            <div>
              {title && <h3 className="dg-card__title">{title}</h3>}
              {subtitle && <p className="dg-card__subtitle">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="dg-card__action">{action}</div>}
        </div>
      )}
      <div className="dg-card__body">{children}</div>
    </div>
  );
}
