import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button.jsx';

/** Viewport-safe dialog: bottom sheet on phones, centred card on larger screens. */
export function Modal({ open, onClose, title, children, footer, side = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={`fixed inset-0 z-50 flex ${side ? 'justify-end' : 'items-end sm:items-center justify-center'}`}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={`relative bg-surface border border-line shadow-soft flex flex-col outline-none ${side ? 'h-full w-full sm:w-[28rem]' : 'w-full sm:max-w-lg rounded-t-card sm:rounded-card max-h-[90dvh]'}`}>
        <div className="flex items-center justify-between gap-3 p-4 border-b border-line">
          <h2 className="truncate">{title}</h2>
          <button className="btn-ghost !px-2" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="p-4 border-t border-line flex flex-col-reverse sm:flex-row sm:justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, text, confirmLabel = 'Confirm', danger, loading, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <p className="text-sm text-muted">{text}</p>
    </Modal>
  );
}
