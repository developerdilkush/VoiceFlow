import { Select, Textarea } from '../common/Field.jsx';
import { Button } from '../common/Button.jsx';
import { VoiceSelector } from '../calls/VoiceSelector.jsx';
import { renderTemplate } from '../../utils/template.js';

export function MessageStep({ cfg, voices, result, onChange, onNext, onBack }) {
  const first = result.recipients[0];
  const individual = cfg.mode === 'individual';
  const withMsg = result.recipients.filter((r) => r.message).length;
  const sample = renderTemplate(individual ? first?.message || cfg.message : cfg.message, first?.name);
  const valid = cfg.voiceId && (cfg.voiceId.startsWith('rec:') || cfg.message.trim() || (individual && withMsg === result.recipients.length));
  return (
    <div className="card p-4 sm:p-6 space-y-5">
      <div role="radiogroup" aria-label="Message mode" className="grid sm:grid-cols-2 gap-3">
        {[['same', 'Same message for everyone'], ['individual', 'Individual message per recipient (from file)']].map(([k, l]) => (
          <label key={k} className={`flex items-center gap-3 min-h-[52px] rounded-ctl border p-3 cursor-pointer ${cfg.mode === k ? 'border-accent bg-accent/5' : 'border-line'}`}>
            <input type="radio" name="mode" checked={cfg.mode === k} onChange={() => onChange({ mode: k })} className="h-5 w-5 accent-[var(--accent)]" /><span className="text-sm">{l}</span>
          </label>
        ))}
      </div>
      <Select label={individual ? 'Default language (for rows without one)' : 'Language'} value={cfg.language} onChange={(e) => onChange({ language: e.target.value, voiceId: '' })}><option value="en">English</option><option value="hi">Hindi (हिन्दी)</option></Select>
      <Textarea label={individual ? `Fallback message (${withMsg}/${result.recipients.length} rows have their own)` : 'Message'} maxLength={500} value={cfg.message} onChange={(e) => onChange({ message: e.target.value })} hint="Use {{name}} for the recipient’s name; “there” is used when a name is missing." />
      <VoiceSelector voices={voices} language={cfg.language} value={cfg.voiceId} onChange={(id) => onChange({ voiceId: id })} previewText={sample} label="Default voice" />
      {sample && <div><p className="label">Preview for first recipient</p><p className="text-sm rounded-ctl bg-bg border border-line p-3 whitespace-pre-wrap">{sample}</p></div>}
      <div className="flex flex-col-reverse sm:flex-row justify-between gap-2"><Button variant="secondary" onClick={onBack}>Back</Button><Button disabled={!valid} onClick={onNext}>Review</Button></div>
    </div>
  );
}
