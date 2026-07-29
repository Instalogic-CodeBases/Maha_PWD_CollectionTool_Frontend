// Reusable modal — same structure/classes as the prototype's #modalOverlay.
// `footer` renders in the modal footer; if omitted, a plain Close button shows.
export default function Modal({ open, title, onClose, footer, wide, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={'modal' + (wide ? ' wide' : '')}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          {footer || <button className="btn" onClick={onClose}>Close</button>}
        </div>
      </div>
    </div>
  );
}
