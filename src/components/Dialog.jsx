import { useEffect, useRef } from 'react';

/**
 * Native <dialog> wrapper: the browser handles focus trapping and Escape-to-close.
 */
export default function Dialog({ open, onClose, title, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby="dialog-title">
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">×</button>
      </div>
      <div className="dialog-body">{open && children}</div>
    </dialog>
  );
}
