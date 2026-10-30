import { useState } from 'react';
import { Play, Square } from 'lucide-react';
import { Select } from '../common/Field.jsx';
import { voicesApi } from '../../services/index.js';
import { previewSpeech, stopSpeech } from '../../utils/speech.js';
import toast from 'react-hot-toast';

/** voices = response of GET /voices ({builtin, recordings}). Lists only voices that support `language`. */
export function VoiceSelector({ voices, language, value, onChange, previewText, error, label = 'Voice' }) {
  const [playing, setPlaying] = useState(false);
  const builtin = (voices?.builtin || []).filter((v) => v.languages.includes(language));
  const recordings = voices?.recordings || [];
  const rec = value?.startsWith('rec:') ? recordings.find((r) => r.voiceId === value) : null;

  const preview = () => {
    if (playing) { stopSpeech(); setPlaying(false); return; }
    try {
      previewSpeech(previewText || (language === 'hi' ? 'नमस्ते, यह एक परीक्षण संदेश है।' : 'Hello, this is a preview message.'), language);
      setPlaying(true);
      setTimeout(() => setPlaying(false), 6000);
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-2">
      <Select label={label} value={value} onChange={(e) => onChange(e.target.value)} error={error}>
        <option value="">Select a voice…</option>
        <optgroup label="AI voices">
          {builtin.map((v) => <option key={v.id} value={v.id}>{v.label} · {v.gender}</option>)}
        </optgroup>
        {recordings.length > 0 && (
          <optgroup label="My recordings">{recordings.map((r) => <option key={r.voiceId} value={r.voiceId}>{r.name}</option>)}</optgroup>
        )}
      </Select>
      {value && !rec && (
        <div className="flex items-center gap-3">
          <button type="button" className="btn-secondary" onClick={preview}>{playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}{playing ? 'Stop' : 'Preview'}</button>
          <p className="hint !mt-0">Approximate browser preview. The real call uses the telephony provider’s voice.</p>
        </div>
      )}
      {rec && <audio controls preload="none" className="w-full" src={voicesApi.audioUrl(rec.id)} aria-label={`Play ${rec.name}`} />}
    </div>
  );
}
