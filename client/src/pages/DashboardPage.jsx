import { Link } from 'react-router-dom';
import { Phone, Users, CheckCircle2, XCircle, Loader, Clock, Wallet, PhoneCall } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { StatCard } from '../components/dashboard/StatCard.jsx';
import { DashboardCharts } from '../components/dashboard/Charts.jsx';
import { ResponsiveTable } from '../components/common/ResponsiveTable.jsx';
import { StatusBadge, SimulatedBadge } from '../components/common/StatusBadge.jsx';
import { EmptyState, ErrorState } from '../components/common/EmptyState.jsx';
import { ProviderBanner } from '../components/common/ProviderBanner.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { dashboardApi } from '../services/index.js';
import { fmtDateTime, fmtDuration, LANG_LABEL } from '../utils/format.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const stats = useAsync(dashboardApi.stats);
  const recent = useAsync(dashboardApi.recent);
  const s = stats.data?.data;
  const credit = s?.credit ? `${s.credit.currency} ${s.credit.balance.toFixed(2)}` : 'Not available';
  const cols = [
    { key: 'name', label: 'Contact', primary: true, render: (r) => r.name || 'Unnamed' },
    { key: 'phoneMasked', label: 'Number' },
    { key: 'createdAt', label: 'Date', render: (r) => fmtDateTime(r.createdAt) },
    { key: 'status', label: 'Status', render: (r) => <span className="inline-flex gap-1.5 flex-wrap justify-end"><StatusBadge status={r.status} />{r.simulated && <SimulatedBadge />}</span> },
    { key: 'durationSeconds', label: 'Duration', render: (r) => fmtDuration(r.durationSeconds) },
    { key: 'language', label: 'Language', render: (r) => LANG_LABEL[r.language] },
    { key: 'voiceLabel', label: 'Voice', render: (r) => `${r.voiceLabel} · ${r.voiceType === 'tts' ? 'AI' : 'Recording'}` },
  ];
  return (
    <>
      <PageHeader title={`Welcome, ${user?.displayName?.split(' ')[0] || ''}`} subtitle={new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}
        actions={<><Link to="/call" className="btn-primary"><Phone className="h-4 w-4" />New Call</Link><Link to="/bulk" className="btn-secondary"><Users className="h-4 w-4" />Bulk Call</Link></>} />
      <ProviderBanner simulated={s?.simulated} />
      {stats.error ? <ErrorState message={stats.error} onRetry={stats.reload} /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <StatCard label="Total calls" value={s?.total ?? 0} icon={PhoneCall} loading={stats.loading} />
            <StatCard label="Answered" value={s?.answered ?? 0} icon={CheckCircle2} loading={stats.loading} />
            <StatCard label="Failed" value={s?.failed ?? 0} icon={XCircle} loading={stats.loading} />
            <StatCard label="In progress" value={s?.inProgress ?? 0} icon={Loader} loading={stats.loading} />
            <StatCard label="Total duration" value={fmtDuration(s?.totalDurationSeconds)} icon={Clock} loading={stats.loading} />
            <StatCard label="Provider credit" value={credit} icon={Wallet} loading={stats.loading} hint={s?.credit ? undefined : 'Not supported by current provider'} />
          </div>
          <DashboardCharts stats={s} loading={stats.loading} />
        </>
      )}
      <section className="card mt-6">
        <h2 className="p-4 pb-2">Recent activity</h2>
        {recent.error ? <ErrorState message={recent.error} onRetry={recent.reload} /> : (
          <ResponsiveTable columns={cols} rows={recent.data?.data} loading={recent.loading}
            empty={<EmptyState icon={Phone} title="No calls yet" text="Your recent calls will appear here." action={<Link to="/call" className="btn-primary">Make your first call</Link>} />} />
        )}
      </section>
    </>
  );
}
