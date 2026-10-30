import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input, Select } from '../components/common/Field.jsx';
import { ErrorState } from '../components/common/EmptyState.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { ConfirmDialog } from '../components/common/Modal.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { authApi, settingsApi, voicesApi } from '../services/index.js';
import { errorMessage } from '../services/api.js';
import { fmtDateTime } from '../utils/format.js';

const TABS = [['preferences', 'Preferences & calling'], ['provider', 'Provider'], ['profile', 'Profile'], ['security', 'Security']];
const num = (label) => z.coerce.number({ invalid_type_error: `${label} must be a number` });
const settingsSchema = z.object({
  defaultLanguage: z.enum(['hi', 'en']), defaultVoiceId: z.string(), defaultMessage: z.string().trim().min(1, 'Default message is required').max(500), theme: z.enum(['system', 'light', 'dark']),
  dashboardRangeDays: num('Range').int().min(1).max(365),
  defaultCountry: z.string().length(2, 'Two-letter country code, e.g. IN').transform((s) => s.toUpperCase()),
  maxCallsPerOperation: num('Limit').int().min(1), maxDailyCalls: num('Limit').int().min(1),
  minRepeatIntervalMinutes: num('Interval').int().min(0).max(10080),
  allowedHours: z.object({ start: num('Start').int().min(0).max(23), end: num('End').int().min(1).max(24) }).refine((h) => h.end > h.start, 'End hour must be after start hour'),
  retry: z.object({ maxAttempts: num('Attempts').int().min(0).max(5), backoffSeconds: num('Backoff').int().min(10).max(3600) }),
  timezone: z.string().min(1), costPerMinute: z.preprocess((v) => (v === '' || v === null ? null : Number(v)), z.number().min(0).nullable()),
});

function PreferencesTab() {
  const s = useAsync(settingsApi.get); const voices = useAsync(voicesApi.list); const { setTheme } = useTheme();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm({ resolver: zodResolver(settingsSchema) });
  useEffect(() => { if (s.data) reset({ ...s.data.data, costPerMinute: s.data.data.costPerMinute ?? '' }); }, [s.data, reset]);
  if (s.error) return <ErrorState message={s.error} onRetry={s.reload} />;
  if (s.loading) return <Skeleton className="h-96" />;
  const d = s.data.data;
  const onSubmit = async (v) => {
    try { const r = await settingsApi.update(v); setTheme(v.theme); reset({ ...r.data, costPerMinute: r.data.costPerMinute ?? '' }); toast.success('Settings saved'); } catch (e) { toast.error(errorMessage(e)); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <section className="card p-4 sm:p-6 space-y-4"><h2>Preferences</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Default language" {...register('defaultLanguage')}><option value="en">English</option><option value="hi">Hindi</option></Select>
          <Select label="Default voice" {...register('defaultVoiceId')}>{voices.data?.data.builtin.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}{voices.data?.data.recordings.map((r) => <option key={r.voiceId} value={r.voiceId}>{r.name} (recording)</option>)}</Select>
          <Input label="Default call message" error={errors.defaultMessage?.message} className="sm:col-span-2" {...register('defaultMessage')} />
          <Select label="Theme" {...register('theme')}><option value="system">Match system</option><option value="light">Light</option><option value="dark">Dark</option></Select>
          <Input label="Dashboard range (days)" type="number" inputMode="numeric" error={errors.dashboardRangeDays?.message} {...register('dashboardRangeDays')} />
        </div></section>
      <section className="card p-4 sm:p-6 space-y-4"><h2>Calling safeguards</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Default country code" maxLength={2} error={errors.defaultCountry?.message} {...register('defaultCountry')} />
          <Input label="Time zone (IANA)" error={errors.timezone?.message} hint="e.g. Asia/Kolkata" {...register('timezone')} />
          <Input label="Max calls per operation" type="number" inputMode="numeric" hint={`Server ceiling: ${d.hardMaxPerOperation}`} error={errors.maxCallsPerOperation?.message} {...register('maxCallsPerOperation')} />
          <Input label="Max calls per 24 hours" type="number" inputMode="numeric" hint={`Server ceiling: ${d.hardMaxDaily}`} error={errors.maxDailyCalls?.message} {...register('maxDailyCalls')} />
          <Input label="Minimum minutes between calls to one number" type="number" inputMode="numeric" error={errors.minRepeatIntervalMinutes?.message} {...register('minRepeatIntervalMinutes')} />
          <div className="grid grid-cols-2 gap-3"><Input label="Calling from (hour)" type="number" inputMode="numeric" {...register('allowedHours.start')} /><Input label="Until (hour)" type="number" inputMode="numeric" error={errors.allowedHours?.message || errors.allowedHours?.end?.message} {...register('allowedHours.end')} /></div>
          <Input label="Retry attempts (transient provider errors)" type="number" inputMode="numeric" error={errors.retry?.maxAttempts?.message} {...register('retry.maxAttempts')} />
          <Input label="Retry backoff (seconds)" type="number" inputMode="numeric" error={errors.retry?.backoffSeconds?.message} {...register('retry.backoffSeconds')} />
          <Input label={`Cost per minute (${d.currency}, optional)`} type="number" step="0.01" inputMode="decimal" hint="Used only for estimates" {...register('costPerMinute')} />
        </div>
      </section>
      <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save settings</Button>
    </form>
  );
}

function ProviderTab() {
  const p = useAsync(settingsApi.provider);
  if (p.error) return <ErrorState message={p.error} onRetry={p.reload} />;
  if (p.loading) return <Skeleton className="h-48" />;
  const d = p.data.data;
  const Row = ({ k, v }) => <div className="flex justify-between gap-4 py-2 border-b border-line last:border-0 text-sm"><dt className="text-muted">{k}</dt><dd className="text-right min-w-0 break-all">{v}</dd></div>;
  return (
    <section className="card p-4 sm:p-6">
      <h2 className="mb-2">Telephony provider</h2>
      <dl>
        <Row k="Active provider" v={<span className="capitalize">{d.provider}{d.simulated ? ' (development mock – no real calls)' : ''}</span>} />
        <Row k="Credentials configured" v={d.configured ? 'Yes' : 'No'} />
        <Row k="Connection" v={<span className={d.connection.ok ? 'text-ok' : 'text-danger'}>{d.connection.detail}</span>} />
        <Row k="Webhook URL" v={d.webhookUrl ? <code className="text-xs">{d.webhookUrl}</code> : 'Set PUBLIC_BASE_URL on the server'} />
      </dl>
      {d.capabilities && !d.capabilities.perCallVoice && <p role="note" className="text-sm rounded-ctl bg-warn/10 border border-warn/40 p-3 mt-3">With this provider the spoken voice and language are set in the provider’s call flow, not per call. The voice chosen in VoiceFlow is only saved in history.{!d.capabilities.cancel ? ' In-progress calls cannot be canceled.' : ''}</p>}
      <p className="hint mt-3">Provider credentials live only in the server’s environment variables and are never sent to the browser. Change them in the server <code>.env</code> and restart.</p>
      <Button variant="secondary" className="mt-3" onClick={p.reload}>Re-check connection</Button>
    </section>
  );
}

const profileSchema = z.object({ displayName: z.string().trim().min(1, 'Required').max(80), email: z.string().trim().email('Enter a valid email'), timezone: z.string().min(1) });
function ProfileTab() {
  const { user, setUser } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(profileSchema), defaultValues: { displayName: user.displayName, email: user.email, timezone: user.timezone } });
  const onSubmit = async (v) => { try { const r = await settingsApi.updateProfile(v); setUser({ ...user, ...r.data }); toast.success('Profile updated'); } catch (e) { toast.error(errorMessage(e)); } };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card p-4 sm:p-6 space-y-4 max-w-xl"><h2>Profile</h2>
      <Input label="Display name" error={errors.displayName?.message} {...register('displayName')} />
      <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
      <Input label="Time zone" error={errors.timezone?.message} {...register('timezone')} />
      <Button type="submit" loading={isSubmitting}>Save profile</Button>
    </form>
  );
}

const pwSchema = z.object({ currentPassword: z.string().min(1, 'Required'), newPassword: z.string().min(10, 'Use at least 10 characters'), confirm: z.string() }).refine((v) => v.newPassword === v.confirm, { message: 'Passwords do not match', path: ['confirm'] });
function SecurityTab() {
  const act = useAsync(authApi.activity);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(pwSchema) });
  const [confirm, setConfirm] = useState(false);
  const onSubmit = async (v) => { try { await authApi.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword }); toast.success('Password changed. Other sessions were signed out.'); reset(); act.reload(); } catch (e) { toast.error(errorMessage(e)); } };
  const revoke = async () => { try { await authApi.revokeSessions(); toast.success('Other sessions signed out'); setConfirm(false); act.reload(); } catch (e) { toast.error(errorMessage(e)); } };
  return (
    <div className="space-y-6 max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card p-4 sm:p-6 space-y-4"><h2>Change password</h2>
        <Input label="Current password" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword')} />
        <Input label="New password" type="password" autoComplete="new-password" error={errors.newPassword?.message} {...register('newPassword')} />
        <Input label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
        <Button type="submit" loading={isSubmitting}>Change password</Button></form>
      <section className="card p-4 sm:p-6 space-y-3"><h2>Sessions</h2><p className="text-sm text-muted">Sign out everywhere else (this browser stays signed in).</p><Button variant="secondary" onClick={() => setConfirm(true)}>Sign out other sessions</Button></section>
      <section className="card p-4 sm:p-6"><h2 className="mb-2">Recent sign-in activity</h2>
        {act.loading ? <Skeleton className="h-24" /> : act.error ? <ErrorState message={act.error} onRetry={act.reload} /> : (
          <ul className="divide-y divide-line text-sm">{act.data.data.map((a, i) => <li key={i} className="py-2 flex justify-between gap-3"><span>{{ 'auth.login': 'Signed in', 'auth.login_failed': 'Failed sign-in attempt', 'auth.password_changed': 'Password changed', 'auth.sessions_revoked': 'Sessions revoked' }[a.action]}<span className="block text-xs text-muted break-all">{a.ip}</span></span><span className="text-muted text-right shrink-0">{fmtDateTime(a.at)}</span></li>)}</ul>
        )}</section>
      <ConfirmDialog open={confirm} title="Sign out other sessions?" text="Every other browser or device will need to sign in again." confirmLabel="Sign out others" onConfirm={revoke} onClose={() => setConfirm(false)} />
    </div>
  );
}

export default function SettingsPage({ tab = 'preferences' }) {
  const [active, setActive] = useState(tab);
  useEffect(() => setActive(tab), [tab]);
  return (
    <>
      <PageHeader title="Settings" />
      <div role="tablist" aria-label="Settings sections" className="flex gap-2 overflow-x-auto mb-6 -mx-3 px-3 sm:mx-0 sm:px-0">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={active === k} onClick={() => setActive(k)} className={`btn whitespace-nowrap ${active === k ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-elevated'}`}>{l}</button>)}
      </div>
      {active === 'preferences' && <PreferencesTab />}{active === 'provider' && <ProviderTab />}{active === 'profile' && <ProfileTab />}{active === 'security' && <SecurityTab />}
    </>
  );
}
