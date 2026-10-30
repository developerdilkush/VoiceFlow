import { useRef, useState } from 'react';
import { Mic, Pencil, Play, Square, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Field.jsx';
import { Modal, ConfirmDialog } from '../components/common/Modal.jsx';
import { EmptyState, ErrorState } from '../components/common/EmptyState.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { voicesApi } from '../services/index.js';
import { errorMessage } from '../services/api.js';
import { fmtBytes, fmtDate, LANG_LABEL } from '../utils/format.js';
import { previewSpeech, stopSpeech } from '../utils/speech.js';

export default function VoiceLibraryPage() {
  const { data, loading, error, reload } = useAsync(voicesApi.list);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [rename, setRename] = useState(null); const [del, setDel] = useState(null); const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState('');
  const fileRef = useRef(null);
  const v = data?.data;

  const onFile = async (file) => {
    if (!file) return;
    if (!/\.(mp3|wav)$/i.test(file.name)) return toast.error('Only MP3 or WAV files are supported.');
    if (file.size > 5 * 1024 * 1024) return toast.error('File is larger than 5 MB.');
    setUploading(true);
    try { await voicesApi.upload(file, name); toast.success('Recording uploaded'); setName(''); reload(); } catch (e) { toast.error(errorMessage(e)); } finally { setUploading(false); }
  };
  const doRename = async () => { setBusy(true); try { await voicesApi.rename(rename.id, rename.name); setRename(null); reload(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); } };
  const doDelete = async () => { setBusy(true); try { await voicesApi.remove(del.id); toast.success('Recording deleted'); setDel(null); reload(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); } };
  const preview = (voice) => {
    if (playing === voice.id) { stopSpeech(); return setPlaying(''); }
    try { previewSpeech(voice.languages.includes('hi') ? 'नमस्ते, यह एक परीक्षण संदेश है।' : 'Hello, this is a preview message.', voice.languages.includes('hi') ? 'hi' : 'en'); setPlaying(voice.id); setTimeout(() => setPlaying(''), 5000); } catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <PageHeader title="Voice library" subtitle="AI voices and your own recordings." />
      {error ? <ErrorState message={error} onRetry={reload} /> : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3">AI voices</h2>
            {loading ? <Skeleton className="h-32" /> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {v.builtin.map((b) => (
                  <div key={b.id} className="card p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2"><div><p className="font-medium">{b.label}</p><p className="text-xs text-muted capitalize">{b.gender} · {b.languages.map((l) => LANG_LABEL[l]).join(', ')}</p></div><span className="text-xs text-ok">Available*</span></div>
                    <p className="text-xs text-muted">{b.note}</p>
                    <Button variant="secondary" icon={playing === b.id ? Square : Play} onClick={() => preview(b)}>{playing === b.id ? 'Stop' : 'Preview'}</Button>
                  </div>
                ))}
              </div>
            )}
            <p className="hint mt-2">*Previews use your browser’s speech engine and only approximate the real call voice. Actual availability depends on your telephony provider account.</p>
          </section>

          <section>
            <h2 className="mb-3">My recordings</h2>
            <div className="card p-4 mb-3 grid gap-3 sm:grid-cols-[1fr_auto] items-end">
              <Input label="Name (optional)" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} hint="MP3 or WAV, up to 5 MB and 60 seconds. Upload only recordings you own or have permission to use." />
              <>
                <input ref={fileRef} type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" className="sr-only" onChange={(e) => { onFile(e.target.files[0]); e.target.value = ''; }} />
                <Button icon={Upload} loading={uploading} onClick={() => fileRef.current.click()}>Upload recording</Button>
              </>
            </div>
            {loading ? <Skeleton className="h-24" /> : !v.recordings.length ? <div className="card"><EmptyState icon={Mic} title="No recordings yet" text="Upload a recording to play your own voice in calls." /></div> : (
              <div className="grid gap-3 md:grid-cols-2">
                {v.recordings.map((r) => (
                  <div key={r.id} className="card p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted">{fmtBytes(r.sizeBytes)} · {r.durationEstimated ? '≈' : ''}{r.durationSeconds}s · {fmtDate(r.createdAt)}</p></div>
                      <span className="flex shrink-0"><button className="btn-ghost !px-2" aria-label={`Rename ${r.name}`} onClick={() => setRename({ id: r.id, name: r.name })}><Pencil className="h-4 w-4" /></button><button className="btn-ghost !px-2 text-danger" aria-label={`Delete ${r.name}`} onClick={() => setDel(r)}><Trash2 className="h-4 w-4" /></button></span></div>
                    <audio controls preload="none" className="w-full" src={voicesApi.audioUrl(r.id)} aria-label={`Play ${r.name}`} />
                  </div>
                ))}
              </div>
            )}
            <p className="hint mt-2">Recordings are delivered to the provider through a time-limited signed link, so the backend’s PUBLIC_BASE_URL must be reachable from the internet. This path has not been verified against a live provider.</p>
          </section>
        </div>
      )}
      <Modal open={!!rename} onClose={() => setRename(null)} title="Rename recording" footer={<><Button variant="secondary" onClick={() => setRename(null)}>Cancel</Button><Button loading={busy} disabled={!rename?.name.trim()} onClick={doRename}>Save</Button></>}>
        <Input label="Name" maxLength={80} value={rename?.name || ''} onChange={(e) => setRename({ ...rename, name: e.target.value })} />
      </Modal>
      <ConfirmDialog open={!!del} danger loading={busy} title="Delete recording?" text={`“${del?.name}” will be permanently deleted.`} confirmLabel="Delete" onConfirm={doDelete} onClose={() => setDel(null)} />
    </>
  );
}
