import { useRef, useState } from 'react';
import { Download, Pencil, Plus, Trash2, Upload, UserX, Contact as ContactIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input, Select } from '../components/common/Field.jsx';
import { ResponsiveTable } from '../components/common/ResponsiveTable.jsx';
import { Pagination } from '../components/common/Pagination.jsx';
import { EmptyState, ErrorState } from '../components/common/EmptyState.jsx';
import { ConfirmDialog } from '../components/common/Modal.jsx';
import { ContactForm } from '../components/contacts/ContactForm.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { contactsApi } from '../services/index.js';
import { errorMessage } from '../services/api.js';
import { LANG_LABEL } from '../utils/format.js';

const consentCls = { confirmed: 'text-ok', unknown: 'text-muted', revoked: 'text-danger' };

export default function ContactsPage() {
  const [q, setQ] = useState(''); const [language, setLanguage] = useState(''); const [consent, setConsent] = useState(''); const [page, setPage] = useState(1);
  const dq = useDebounce(q);
  const list = useAsync(() => contactsApi.list({ q: dq || undefined, language: language || undefined, consent: consent || undefined, page, limit: 15 }), [dq, language, consent, page]);
  const [form, setForm] = useState(null); // {contact?}
  const [del, setDel] = useState(null); const [opt, setOpt] = useState(null); const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const save = async (v) => {
    const body = { ...v }; if (form.contact && !body.phone) delete body.phone;
    try { form.contact ? await contactsApi.update(form.contact.id, body) : await contactsApi.create(body); toast.success('Contact saved'); setForm(null); list.reload(); } catch (e) { toast.error(errorMessage(e)); }
  };
  const run = async (fn, msg) => { setBusy(true); try { await fn(); toast.success(msg); list.reload(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); setDel(null); setOpt(null); } };
  const onImport = async (f) => {
    if (!f) return;
    try { const r = await contactsApi.importFile(f); toast.success(`Imported ${r.data.created} contacts (${r.data.skipped} skipped)`); list.reload(); } catch (e) { toast.error(errorMessage(e)); }
  };

  const cols = [
    { key: 'name', label: 'Name', primary: true, render: (c) => c.name || 'Unnamed' }, { key: 'phoneMasked', label: 'Number' },
    { key: 'language', label: 'Language', render: (c) => LANG_LABEL[c.language] },
    { key: 'consent', label: 'Consent', render: (c) => <span className={`capitalize ${consentCls[c.consent?.status]}`}>{c.consent?.status}{c.consent?.source ? ` · ${c.consent.source.replace('_', ' ')}` : ''}</span> },
    { key: 'actions', label: '', render: (c) => (
      <span className="inline-flex gap-1">
        <button className="btn-ghost !px-2" aria-label={`Edit ${c.name || 'contact'}`} onClick={() => setForm({ contact: c })}><Pencil className="h-4 w-4" /></button>
        <button className="btn-ghost !px-2" aria-label="Opt out and suppress" onClick={() => setOpt(c)}><UserX className="h-4 w-4" /></button>
        <button className="btn-ghost !px-2 text-danger" aria-label="Delete" onClick={() => setDel(c)}><Trash2 className="h-4 w-4" /></button>
      </span>) },
  ];
  return (
    <>
      <PageHeader title="Contacts" subtitle="People you may call, with their consent details."
        actions={<>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" className="sr-only" onChange={(e) => { onImport(e.target.files[0]); e.target.value = ''; }} />
          <Button variant="secondary" icon={Upload} onClick={() => fileRef.current.click()}>Import</Button>
          <a className="btn-secondary" href={contactsApi.exportUrl()}><Download className="h-4 w-4" />Export</a>
          <Button icon={Plus} onClick={() => setForm({})}>Add contact</Button></>} />
      <div className="card">
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <Input label="Search name" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          <Select label="Language" value={language} onChange={(e) => { setLanguage(e.target.value); setPage(1); }}><option value="">All</option><option value="en">English</option><option value="hi">Hindi</option></Select>
          <Select label="Consent" value={consent} onChange={(e) => { setConsent(e.target.value); setPage(1); }}><option value="">All</option><option value="confirmed">Confirmed</option><option value="unknown">Unknown</option><option value="revoked">Revoked</option></Select>
        </div>
        {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : (
          <ResponsiveTable columns={cols} rows={list.data?.data} loading={list.loading}
            empty={<EmptyState icon={ContactIcon} title="No contacts found" text="Add a contact or import a CSV/XLSX file." action={<Button icon={Plus} onClick={() => setForm({})}>Add contact</Button>} />} />
        )}
        <div className="px-4 pb-4"><Pagination meta={list.data?.meta} onPage={setPage} /></div>
      </div>
      <ContactForm open={!!form} contact={form?.contact} onClose={() => setForm(null)} onSubmit={save} />
      <ConfirmDialog open={!!del} danger loading={busy} title="Delete contact?" text="The contact is removed. Past call history is kept." confirmLabel="Delete" onConfirm={() => run(() => contactsApi.remove(del.id), 'Contact deleted')} onClose={() => setDel(null)} />
      <ConfirmDialog open={!!opt} danger loading={busy} title="Opt out this contact?" text="Consent is marked revoked and the number is added to the suppression list, so it can never be called." confirmLabel="Opt out" onConfirm={() => run(() => contactsApi.optOut(opt.id), 'Contact opted out')} onClose={() => setOpt(null)} />
    </>
  );
}
