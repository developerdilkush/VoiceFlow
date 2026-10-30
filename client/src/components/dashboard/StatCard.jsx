import { Skeleton } from '../common/Skeleton.jsx';

export function StatCard({ label, value, icon: Icon, loading, hint }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-muted text-sm"><span>{label}</span>{Icon && <Icon className="h-4 w-4" aria-hidden />}</div>
      {loading ? <Skeleton className="h-8 w-20 mt-2" /> : <p className="text-2xl font-semibold mt-1 break-words">{value}</p>}
      {hint && !loading && <p className="hint">{hint}</p>}
    </div>
  );
}
