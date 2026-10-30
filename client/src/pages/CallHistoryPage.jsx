import { useState } from 'react';
import { Download, History } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { Input, Select } from '../components/common/Field.jsx';
import { ResponsiveTable } from '../components/common/ResponsiveTable.jsx';
import { Pagination } from '../components/common/Pagination.jsx';
import { EmptyState, ErrorState } from '../components/common/EmptyState.jsx';
import { StatusBadge, SimulatedBadge } from '../components/common/StatusBadge.jsx';
import { CallDetailDrawer } from '../components/calls/CallDetailDrawer.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { callsApi } from '../services/index.js';
import { fmtDateTime, fmtDuration, LANG_LABEL, STATUS_LABEL } from '../utils/format.js';

export default function CallHistoryPage() {
  const [f, setF] = useState({ q: '', status: '', language: '', source: '', from: '', to: '', sort: 'createdAt', order: 'desc' });
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const dq = useDebounce(f.q);
  const params = Object.fromEntries(Object.entries({ ...f, q: dq }).filter(([, v]) => v));
  const list = useAsync(() => callsApi.list({ ...params, page, limit: 15 }), [JSON.stringify(params), page]);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1); };

  const cols = [
    { key: 'name', label: 'Contact', primary: true, render: (c) => c.name || 'Unnamed' }, { key: 'phoneMasked', label: 'Number' },
    { key: 'createdAt', label: 'Date', render: (c) => fmtDateTime(c.createdAt) },
    { key: 'status', label: 'Status', render: (c) => <span className="inline-flex gap-1.5 flex-wrap justify-end"><StatusBadge status={c.status} />{c.simulated && <SimulatedBadge />}</span> },
    { key: 'durationSeconds', label: 'Duration', render: (c) => fmtDuration(c.durationSeconds) }, { key: 'language', label: 'Language', render: (c) => LANG_LABEL[c.language] },
    { key: 'voiceType', label: 'Voice', render: (c) => (c.voiceType === 'tts' ? 'AI' : 'Recording') }, { key: 'source', label: 'Source', render: (c) => (c.source === 'bulk' ? 'Bulk' : 'Single') },
  ];
  return (
    <>
      <PageHeader title="Call history" actions={<a className="btn-secondary" href={callsApi.exportUrl(params)}><Download className="h-4 w-4" />Export CSV</a>} />
      <div className="card">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Search contact" value={f.q} onChange={set('q')} />
          <Select label="Status" value={f.status} onChange={set('status')}><option value="">All</option>{Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Select label="Language" value={f.language} onChange={set('language')}><option value="">All</option><option value="en">English</option><option value="hi">Hindi</option></Select>
          <Select label="Type" value={f.source} onChange={set('source')}><option value="">Single + Bulk</option><option value="single">Single</option><option value="bulk">Bulk</option></Select>
          <Input label="From" type="date" value={f.from} onChange={set('from')} /><Input label="To" type="date" value={f.to} onChange={set('to')} />
          <Select label="Sort by" value={f.sort} onChange={set('sort')}><option value="createdAt">Date</option><option value="status">Status</option><option value="durationSeconds">Duration</option><option value="name">Contact</option></Select>
          <Select label="Order" value={f.order} onChange={set('order')}><option value="desc">Newest / highest first</option><option value="asc">Oldest / lowest first</option></Select>
        </div>
        {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : (
          <ResponsiveTable columns={cols} rows={list.data?.data} loading={list.loading} onRowClick={(c) => setOpenId(c.id)}
            empty={<EmptyState icon={History} title="No calls match" text="Try changing the filters." />} />
        )}
        <div className="px-4 pb-4"><Pagination meta={list.data?.meta} onPage={setPage} /></div>
      </div>
      <CallDetailDrawer id={openId} onClose={() => setOpenId(null)} onChanged={list.reload} />
    </>
  );
}
