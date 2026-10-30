import { useEffect, useState } from 'react';
import { Download, Pause, Play, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../common/Button.jsx';
import { ConfirmDialog } from '../common/Modal.jsx';
import { bulkApi } from '../../services/index.js';
import { errorMessage } from '../../services/api.js';

const Stat = ({ k, v }) => <div className="card p-3"><p className="text-xs text-muted">{k}</p><p className="text-xl font-semibold">{v}</p></div>;

export function JobProgress({ jobId, onDone }) {
  const [job, setJob] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stop = false;
    const load = async () => { try { const r = await bulkApi.getJob(jobId); !stop && setJob(r.data); } catch { /* keep last */ } };
    load();
    const t = setInterval(() => { if (!job || ['running', 'paused'].includes(job.status)) load(); }, 3000);
    return () => { stop = true; clearInterval(t); };
  }, [jobId, job?.status]); // eslint-disable-line

  const act = async (a) => {
    setBusy(true);
    try { setJob((await bulkApi.action(jobId, a)).data); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); setConfirmCancel(false); }
  };
  if (!job) return <p className="text-sm text-muted">Loading job…</p>;
  const p = job.progress, c = p.counts;
  const pct = p.total ? Math.round((p.processed / p.total) * 100) : 0;
  return (
    <div className="space-y-4" aria-live="polite">
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2>{job.name || 'Bulk job'} <span className="text-sm font-normal text-muted capitalize">· {job.status}</span></h2>
          <div className="flex flex-wrap gap-2">
            {job.status === 'running' && <Button variant="secondary" icon={Pause} loading={busy} onClick={() => act('pause')}>Pause</Button>}
            {job.status === 'paused' && <Button variant="secondary" icon={Play} loading={busy} onClick={() => act('resume')}>Resume</Button>}
            {['running', 'paused'].includes(job.status) && <Button variant="danger" icon={XCircle} onClick={() => setConfirmCancel(true)}>Cancel pending</Button>}
            <a className="btn-secondary" href={bulkApi.exportUrl(jobId)}><Download className="h-4 w-4" />Export CSV</a>
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-line overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Job progress"><div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} /></div>
        <p className="text-sm text-muted">{p.processed} of {p.total} processed ({pct}%)</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Stat k="Total" v={p.total} /><Stat k="Processed" v={p.processed} /><Stat k="Answered" v={p.answered} /><Stat k="Completed" v={c.completed || 0} /><Stat k="Failed" v={c.failed || 0} />
        <Stat k="Busy" v={c.busy || 0} /><Stat k="No answer" v={c.no_answer || 0} /><Stat k="Skipped" v={c.skipped || 0} /><Stat k="Canceled" v={c.canceled || 0} /><Stat k="Remaining" v={p.remaining} />
      </div>
      <Button variant="secondary" onClick={onDone}>Back to bulk calling</Button>
      <ConfirmDialog open={confirmCancel} danger loading={busy} title="Cancel pending calls?" text="Calls already in progress continue, but every call still waiting in the queue is canceled. This cannot be undone." confirmLabel="Cancel pending" onConfirm={() => act('cancel')} onClose={() => setConfirmCancel(false)} />
    </div>
  );
}
