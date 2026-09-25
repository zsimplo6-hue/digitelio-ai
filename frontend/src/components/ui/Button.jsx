export function Button({ variant = "primary", size = "md", icon, children, className = "", ...props }) {
  return (
    <button className={`dg-btn dg-btn--${variant} dg-btn--${size} ${className}`} {...props}>
      {icon && <span className="dg-btn__icon">{icon}</span>}
      {children}
    </button>
  );
}
