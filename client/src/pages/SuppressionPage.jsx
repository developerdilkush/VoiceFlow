import { useState } from 'react';
import { ShieldOff, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input, Select } from '../components/common/Field.jsx';
import { ResponsiveTable } from '../components/common/ResponsiveTable.jsx';
import { Pagination } from '../components/common/Pagination.jsx';
import { ConfirmDialog } from '../components/common/Modal.jsx';
import { EmptyState, ErrorState } from '../components/common/EmptyState.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { suppressionApi } from '../services/index.js';
import { errorMessage } from '../services/api.js';
import { fmtDate } from '../utils/format.js';

const REASONS = { opt_out: 'Opted out', complaint: 'Complaint', invalid: 'Invalid number', manual: 'Manual' };

export default function SuppressionPage() {
  const [page, setPage] = useState(1);
  const list = useAsync(() => suppressionApi.list({ page, limit: 15 }), [page]);
  const [phone, setPhone] = useState(''); const [reason, setReason] = useState('opt_out'); const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false); const [del, setDel] = useState(null); const [busy, setBusy] = useState(false);

  const add = async (e) => {
    e.preventDefault(); setAdding(true);
    try { await suppressionApi.create({ phone, reason, note }); toast.success('Number suppressed'); setPhone(''); setNote(''); list.reload(); } catch (err) { toast.error(errorMessage(err)); } finally { setAdding(false); }
  };
  const remove = async () => { setBusy(true); try { await suppressionApi.remove(del.id); toast.success('Removed'); setDel(null); list.reload(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); } };
  const cols = [
    { key: 'phoneMasked', label: 'Number', primary: true }, { key: 'reason', label: 'Reason', render: (s) => REASONS[s.reason] }, { key: 'note', label: 'Note', render: (s) => s.note || '—' },
    { key: 'createdAt', label: 'Added', render: (s) => fmtDate(s.createdAt) },
    { key: 'a', label: '', render: (s) => <button className="btn-ghost !px-2 text-danger" aria-label="Remove from suppression list" onClick={() => setDel(s)}><Trash2 className="h-4 w-4" /></button> },
  ];
  return (
    <>
      <PageHeader title="Suppression list" subtitle="Numbers here are never called, in single or bulk mode." />
      <form onSubmit={add} className="card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_12rem_1fr_auto] items-end mb-6">
        <Input label="Phone number" type="tel" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>{Object.entries(REASONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Input label="Note (optional)" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        <Button type="submit" loading={adding}>Add</Button>
      </form>
      <div className="card">
        {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : (
          <ResponsiveTable columns={cols} rows={list.data?.data} loading={list.loading} empty={<EmptyState icon={ShieldOff} title="Nothing suppressed" text="Add numbers that asked not to be called." />} />
        )}
        <div className="px-4 pb-4"><Pagination meta={list.data?.meta} onPage={setPage} /></div>
      </div>
      <ConfirmDialog open={!!del} danger loading={busy} title="Remove from suppression list?" text="Only do this if the person has asked to receive calls again." confirmLabel="Remove" onConfirm={remove} onClose={() => setDel(null)} />
    </>
  );
}
