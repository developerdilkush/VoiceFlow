import { Skeleton } from './Skeleton.jsx';

/** Real table from md up; stacked cards on phones (no horizontal scrolling). columns: [{key,label,render?,primary?}] */
export function ResponsiveTable({ columns, rows, loading, onRowClick, rowKey = 'id', empty }) {
  if (loading) return <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!rows?.length) return empty || null;
  const cell = (c, r) => (c.render ? c.render(r) : r[c.key] ?? '—');
  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted border-b border-line">{columns.map((c) => <th key={c.key} className="font-medium px-4 py-3 whitespace-nowrap">{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[rowKey]} onClick={onRowClick ? () => onRowClick(r) : undefined} className={`border-b border-line last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-elevated' : ''}`}>
                {columns.map((c) => <td key={c.key} className="px-4 py-3 align-middle">{cell(c, r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="md:hidden divide-y divide-line">
        {rows.map((r) => (
          <li key={r[rowKey]} onClick={onRowClick ? () => onRowClick(r) : undefined} className={`p-4 space-y-1.5 ${onRowClick ? 'active:bg-elevated cursor-pointer' : ''}`}>
            {columns.map((c) => (
              <div key={c.key} className={`flex items-start justify-between gap-3 ${c.primary ? 'font-medium' : 'text-sm'}`}>
                <span className="text-muted text-xs pt-0.5 shrink-0">{c.label}</span>
                <span className="text-right min-w-0">{cell(c, r)}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </>
  );
}
