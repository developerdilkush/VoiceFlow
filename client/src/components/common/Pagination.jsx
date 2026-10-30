import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return meta ? <p className="text-xs text-muted pt-3">{meta.total} total</p> : null;
  return (
    <div className="flex items-center justify-between gap-2 pt-4">
      <p className="text-xs text-muted">Page {meta.page} of {meta.pages} · {meta.total} total</p>
      <div className="flex gap-2">
        <button className="btn-secondary !px-3" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        <button className="btn-secondary !px-3" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
