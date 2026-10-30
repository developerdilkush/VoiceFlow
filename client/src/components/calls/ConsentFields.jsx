import { Checkbox, Select } from '../common/Field.jsx';
import { CONSENT_SOURCES } from '../../utils/format.js';

export function ConsentFields({ checked, onChecked, source, onSource, error, many = false }) {
  return (
    <fieldset className="rounded-ctl border border-line p-3 space-y-2">
      <legend className="px-1 text-sm font-medium">Consent</legend>
      <Checkbox checked={checked} onChange={(e) => onChecked(e.target.checked)} error={error}
        label={many ? 'I confirm every recipient has agreed to receive these automated calls and I keep a record of that permission.' : 'I confirm the recipient has agreed to receive this automated call and I keep a record of that permission.'} />
      <Select label="How was permission given?" value={source} onChange={(e) => onSource(e.target.value)}>
        {CONSENT_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </Select>
      <p className="hint">This confirmation is stored with the call. A tick-box is a record of your statement, not legal proof of consent.</p>
    </fieldset>
  );
}
