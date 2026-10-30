import { useState } from 'react';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../common/Button.jsx';
import { Textarea } from '../common/Field.jsx';
import { bulkApi } from '../../services/index.js';
import { errorMessage } from '../../services/api.js';

const MAX_BYTES = 2 * 1024 * 1024;

export function ImportStep({ onResult }) {
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    if (!/\.(csv|xlsx)$/i.test(file.name)) return toast.error('Please choose a .csv or .xlsx file.');
    if (file.size > MAX_BYTES) return toast.error('File is larger than 2 MB.');
    setBusy(true);
    try { await onResult((await bulkApi.importFile(file)).data); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const handleManual = async () => {
    const rows = manual.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [phone, ...name] = l.split(/[,\t]/); return { phone: phone.trim(), name: name.join(' ').trim() }; });
    if (!rows.length) return toast.error('Enter at least one number.');
    setBusy(true);
    try { await onResult((await bulkApi.importRows(rows)).data); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-4 sm:p-6 space-y-3">
        <h2>Upload CSV or XLSX</h2>
        <p className="text-sm text-muted">Your file needs one phone-number column. CSV/XLSX accepted, max 2 MB.</p>
        <label className="flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line p-6 text-center cursor-pointer hover:bg-elevated min-h-[140px]">
          <Upload className="h-6 w-6 text-accent" aria-hidden />
          <span className="text-sm font-medium">{busy ? 'Checking file…' : 'Choose a file'}</span>
          <input type="file" accept=".csv,.xlsx" className="sr-only" disabled={busy} onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }} />
        </label>
      </div>
      <div className="card p-4 sm:p-6 space-y-3">
        <h2>Enter numbers manually</h2>
        <Textarea label="One phone number per line" value={manual} onChange={(e) => setManual(e.target.value)} placeholder={'+919876543210\n+919812345678'} />
        <Button onClick={handleManual} loading={busy}>Start bulk calls</Button>
      </div>
    </div>
  );
}
