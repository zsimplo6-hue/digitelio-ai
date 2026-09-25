export function Input({ label, type = "text", trailing, ...props }) {
  return (
    <div className="dg-field">
      {label && <label className="dg-field__label">{label}</label>}
      <div className="dg-field__wrap">
        <input type={type} className="dg-field__input" {...props} />
        {trailing && <span className="dg-field__trailing">{trailing}</span>}
      </div>
    </div>
  );
}

export function Select({ label, children, ...props }) {
  return (
    <div className="dg-field">
      {label && <label className="dg-field__label">{label}</label>}
      <select className="dg-field__input dg-field__select" {...props}>
        {children}
      </select>
    </div>
  );
}

export function Toggle({ label, sublabel, checked, onChange }) {
  return (
    <div className="dg-toggle-row">
      <div>
        <p className="dg-toggle-row__label">{label}</p>
        {sublabel && <p className="dg-toggle-row__sublabel">{sublabel}</p>}
      </div>
      <button
        type="button"
        className={`dg-switch ${checked ? "is-on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className="dg-switch__thumb" />
      </button>
    </div>
  );
}
