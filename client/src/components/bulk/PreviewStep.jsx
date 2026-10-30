import { useState } from 'react';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../common/Button.jsx';
import { Select } from '../common/Field.jsx';
import { ResponsiveTable } from '../common/ResponsiveTable.jsx';
import { bulkApi } from '../../services/index.js';
import { errorMessage } from '../../services/api.js';
import { csvCell, download } from '../../utils/format.js';

const FIELDS = [['name', 'Name'], ['phone', 'Phone number'], ['message', 'Message'], ['language', 'Language'], ['voice', 'Voice']];
const Stat = ({ k, v, warn }) => <div className="card p-3"><p className="text-xs text-muted">{k}</p><p className={`text-xl font-semibold ${warn && v ? 'text-warn' : ''}`}>{v}</p></div>;

export function PreviewStep({ result, file, onResult, onNext, onBack }) {
  const [mapping, setMapping] = useState(result.mapping);
  const [busy, setBusy] = useState(false);
  const s = result.summary;
  const over = result.recipients.length > result.limit;

  const revalidate = async () => {
    setBusy(true);
    try { onResult((await bulkApi.importFile(file, mapping)).data, file); toast.success('Re-validated'); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const errorReport = () => {
    const rows = [['Row', 'Status', 'Input', 'Reason'], ...result.errors.map((e) => [e.row, e.status, e.input, e.reason])];
    download('import-errors.csv', rows.map((r) => r.map(csvCell).join(',')).join('\n'));
  };
  const cols = [
    { key: 'row', label: 'Row' }, { key: 'name', label: 'Name', render: (r) => r.name || '—' }, { key: 'phoneMasked', label: 'Number', render: (r) => r.phoneMasked || r.input || '—' },
    { key: 'status', label: 'Result', primary: true, render: (r) => <span className={r.status === 'valid' ? 'text-ok' : 'text-warn'}>{r.status === 'valid' ? (r.emptyMessage ? 'Valid (no message)' : 'Valid') : `${r.status}: ${r.reasons.join(', ')}`}</span> },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat k="Total rows" v={s.total} /><Stat k="Valid" v={s.valid} /><Stat k="Invalid" v={s.invalid} warn /><Stat k="Duplicates" v={s.duplicates} warn /><Stat k="Suppressed" v={s.suppressed} warn /><Stat k="No message" v={s.emptyMessages} warn />
      </div>
      {over && <p role="alert" className="text-sm text-danger rounded-ctl bg-danger/10 p-3">Your limit is {result.limit} recipients per operation but {result.recipients.length} are valid. Split the file or raise the limit in Settings.</p>}
      {file && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-medium min-h-[44px] flex items-center">Column mapping</summary>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mt-3">
            {FIELDS.map(([k, label]) => (
              <Select key={k} label={label} value={mapping[k] || ''} onChange={(e) => setMapping({ ...mapping, [k]: e.target.value })}>
                <option value="">— none —</option>{result.headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </Select>
            ))}
          </div>
          <Button variant="secondary" className="mt-3" loading={busy} onClick={revalidate}>Re-validate with this mapping</Button>
        </details>
      )}
      <div className="card"><div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-2"><h2>Preview (first {result.preview.length} rows)</h2>
        {result.errors.length > 0 && <Button variant="secondary" icon={Download} onClick={errorReport}>Error report</Button>}</div>
        <ResponsiveTable columns={cols} rows={result.preview} rowKey="row" /></div>
      <div className="flex flex-col-reverse sm:flex-row justify-between gap-2">
        <Button variant="secondary" onClick={onBack}>Start over</Button>
        <Button disabled={!s.valid || over} onClick={onNext}>Continue with {s.valid} recipients</Button>
      </div>
    </div>
  );
}
