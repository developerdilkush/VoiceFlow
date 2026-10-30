import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { Skeleton } from '../common/Skeleton.jsx';
import { StatusBadge, SimulatedBadge } from '../common/StatusBadge.jsx';
import { callsApi } from '../../services/index.js';
import { errorMessage } from '../../services/api.js';
import { useAsync } from '../../hooks/useAsync.js';
import { fmtDateTime, fmtDuration, LANG_LABEL } from '../../utils/format.js';

const Row = ({ k, v }) => <div className="flex justify-between gap-4 py-2 border-b border-line last:border-0 text-sm"><dt className="text-muted shrink-0">{k}</dt><dd className="text-right min-w-0">{v || '—'}</dd></div>;

export function CallDetailDrawer({ id, onClose, onChanged }) {
  const { data, loading, error, reload } = useAsync(() => (id ? callsApi.get(id) : Promise.resolve(null)), [id]);
  const [busy, setBusy] = useState(false);
  const c = data?.data;
  const cancelable = c && ['queued', 'initiated', 'ringing', 'answered'].includes(c.status);
  const cancel = async () => {
    setBusy(true);
    try { await callsApi.cancel(id); toast.success('Cancel requested'); reload(); onChanged?.(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Modal side open={!!id} onClose={onClose} title="Call details" footer={cancelable && <Button variant="danger" loading={busy} onClick={cancel}>Cancel call</Button>}>
      {loading && <div className="space-y-3"><Skeleton className="h-6" /><Skeleton className="h-40" /></div>}
      {error && <p className="text-danger text-sm" role="alert">{error}</p>}
      {c && (
        <>
          <div className="flex items-center gap-2 mb-3"><StatusBadge status={c.status} />{c.simulated && <SimulatedBadge />}</div>
          <dl>
            <Row k="Contact" v={c.name} /><Row k="Number" v={c.phoneMasked} /><Row k="Source" v={c.source === 'bulk' ? 'Bulk' : 'Single'} />
            <Row k="Language" v={LANG_LABEL[c.language]} /><Row k="Voice" v={`${c.voiceLabel} (${c.voiceType === 'tts' ? 'AI' : 'recording'})`} />
            <Row k="Created" v={fmtDateTime(c.createdAt)} /><Row k="Answered" v={c.answeredAt && fmtDateTime(c.answeredAt)} /><Row k="Ended" v={c.completedAt && fmtDateTime(c.completedAt)} />
            <Row k="Duration" v={fmtDuration(c.durationSeconds)} /><Row k="Provider" v={c.provider} /><Row k="Provider reference" v={<code className="text-xs break-all">{c.providerCallId}</code>} />
            <Row k="Attempts" v={String(c.attempts)} />{c.failureReason && <Row k="Reason" v={c.failureReason} />}
          </dl>
          {c.message && <div className="mt-4"><p className="label">Message</p><p className="text-sm rounded-ctl bg-bg border border-line p-3 whitespace-pre-wrap">{c.message}</p></div>}
        </>
      )}
    </Modal>
  );
}
