import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../common/Button.jsx';
import { Input } from '../common/Field.jsx';
import { ConsentFields } from '../calls/ConsentFields.jsx';
import { bulkApi } from '../../services/index.js';
import { errorMessage } from '../../services/api.js';
import { LANG_LABEL } from '../../utils/format.js';

export function ReviewStep({ cfg, result, settings, onStarted, onBack }) {
  const [consent, setConsent] = useState(false);
  const [source, setSource] = useState('verbal');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());
  const n = result.recipients.length;
  const cost = settings.costPerMinute != null ? `≥ ${settings.currency} ${(n * settings.costPerMinute).toFixed(2)} (each call billed per started minute)` : 'Not available (set a per-minute rate in Settings)';

  const start = async () => {
    if (!consent) return toast.error('Confirm consent to continue.');
    setBusy(true);
    try {
      const res = await bulkApi.createJob({ name, mode: cfg.mode, message: cfg.message, language: cfg.language, voiceId: cfg.voiceId, recipients: result.recipients, consentConfirmed: consent, consentSource: source }, key.current);
      toast.success('Bulk job started'); onStarted(res.data);
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <div className="card p-4 sm:p-6 space-y-5">
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div><dt className="text-muted">Eligible recipients</dt><dd className="font-semibold text-lg">{n}</dd></div>
        <div><dt className="text-muted">Excluded (invalid / duplicate / suppressed)</dt><dd className="font-semibold text-lg">{result.summary.invalid + result.summary.duplicates + result.summary.suppressed}</dd></div>
        <div><dt className="text-muted">Mode</dt><dd>{cfg.mode === 'same' ? 'Same message' : 'Individual messages'}</dd></div>
        <div><dt className="text-muted">Default language</dt><dd>{LANG_LABEL[cfg.language]}</dd></div>
        <div className="sm:col-span-2"><dt className="text-muted">Estimated usage</dt><dd>{cost}</dd></div>
      </dl>
      <p className="hint">Calls run through a controlled queue and only inside your allowed calling hours. Numbers added to the suppression list before dispatch are skipped.</p>
      <Input label="Job name (optional)" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
      <ConsentFields many checked={consent} onChecked={setConsent} source={source} onSource={setSource} />
      <div className="flex flex-col-reverse sm:flex-row justify-between gap-2"><Button variant="secondary" onClick={onBack} disabled={busy}>Back</Button><Button loading={busy} onClick={start}>Start bulk call ({n})</Button></div>
    </div>
  );
}
