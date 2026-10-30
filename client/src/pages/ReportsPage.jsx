import { useState } from 'react';
import { Download } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { Input } from '../components/common/Field.jsx';
import { StatCard } from '../components/dashboard/StatCard.jsx';
import { DashboardCharts } from '../components/dashboard/Charts.jsx';
import { ErrorState } from '../components/common/EmptyState.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { reportsApi } from '../services/index.js';
import { fmtDuration } from '../utils/format.js';

export default function ReportsPage() {
  const [range, setRange] = useState({ from: '', to: '' });
  const params = Object.fromEntries(Object.entries(range).filter(([, v]) => v));
  const calls = useAsync(() => reportsApi.calls(params), [range.from, range.to]);
  const usage = useAsync(() => reportsApi.usage(params), [range.from, range.to]);
  const r = calls.data?.data, u = usage.data?.data;
  return (
    <>
      <PageHeader title="Reports & analytics" subtitle="Calculated from stored call records." actions={<a className="btn-secondary" href={reportsApi.csvUrl(params)}><Download className="h-4 w-4" />Export CSV</a>} />
      <div className="card p-4 grid gap-3 sm:grid-cols-2 max-w-xl mb-6">
        <Input label="From" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        <Input label="To" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        <p className="hint sm:col-span-2 !mt-0">Leave empty for the last 30 days.</p>
      </div>
      {calls.error ? <ErrorState message={calls.error} onRetry={calls.reload} /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <StatCard label="Answered rate" value={`${r?.rates.answered ?? 0}%`} loading={calls.loading} />
            <StatCard label="Completion rate" value={`${r?.rates.completed ?? 0}%`} loading={calls.loading} />
            <StatCard label="Failure rate" value={`${r?.rates.failed ?? 0}%`} loading={calls.loading} />
            <StatCard label="Total duration" value={fmtDuration(r?.totalDurationSeconds)} loading={calls.loading} />
            <StatCard label="Estimated cost" value={u?.estimatedCost != null ? `${u.currency} ${u.estimatedCost}` : 'Not set'} loading={usage.loading} hint={u ? `${u.billableMinutes} billable min` : undefined} />
            <StatCard label="Single / Bulk" value={`${r?.bySource?.single ?? 0} / ${r?.bySource?.bulk ?? 0}`} loading={calls.loading} />
          </div>
          <DashboardCharts stats={r} loading={calls.loading} />
        </>
      )}
      <details className="card p-4 mt-6 text-sm">
        <summary className="cursor-pointer font-medium min-h-[44px] flex items-center">How these numbers are calculated</summary>
        <ul className="list-disc pl-5 space-y-1.5 text-muted mt-2">
          <li><strong>Dispatched</strong>: calls that were actually handed to the provider (skipped, canceled-before-dispatch and failed-before-dispatch calls are excluded from rates).</li>
          <li><strong>Answered rate</strong>: dispatched calls with an “answered” timestamp ÷ dispatched calls.</li>
          <li><strong>Completion rate</strong>: dispatched calls with final status “completed” ÷ dispatched calls. Provider acceptance of a request is never counted as completion.</li>
          <li><strong>Failure rate</strong>: dispatched calls with final status “failed” ÷ dispatched calls. Busy and no-answer are reported separately.</li>
          <li><strong>Billable minutes</strong>: sum of each call’s duration rounded up to a whole minute. <strong>Estimated cost</strong> = billable minutes × your per-minute rate (Settings); the provider’s invoice is authoritative.</li>
          <li>Days are grouped in your configured time zone.</li>
        </ul>
      </details>
    </>
  );
}
