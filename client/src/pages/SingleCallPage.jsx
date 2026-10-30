import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Phone } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { Input } from '../components/common/Field.jsx';
import { Button } from '../components/common/Button.jsx';
import { ProviderBanner } from '../components/common/ProviderBanner.jsx';
import { StatusBadge, SimulatedBadge } from '../components/common/StatusBadge.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { callsApi, settingsApi } from '../services/index.js';
import { errorMessage } from '../services/api.js';
import { fmtDuration } from '../utils/format.js';

export const singleCallSchema = z.object({
  phone: z.string().trim().min(5, 'Enter a phone number').max(25, 'Number is too long').regex(/^[+\d][\d\s()-]*$/, 'Use digits, spaces and an optional +country code'),
});

const TERMINAL = ['completed', 'busy', 'no_answer', 'failed', 'canceled', 'skipped'];

export default function SingleCallPage() {
  const settings = useAsync(settingsApi.get);
  const provider = useAsync(settingsApi.provider);
  const idemKey = useRef(crypto.randomUUID());
  const [active, setActive] = useState(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(singleCallSchema), defaultValues: { phone: '' } });

  useEffect(() => {
    if (!active || TERMINAL.includes(active.status)) return undefined;
    const timer = setInterval(async () => { try { setActive((await callsApi.get(active.id)).data); } catch { /* retain last known status */ } }, 3000);
    return () => clearInterval(timer);
  }, [active]);

  const send = async ({ phone }) => {
    try {
      const result = await callsApi.create({ phone }, idemKey.current);
      idemKey.current = crypto.randomUUID();
      setActive(result.data);
      reset();
      toast.success('Call started — tracking status');
    } catch (error) { toast.error(errorMessage(error)); }
  };

  const country = settings.data?.data.defaultCountry || 'IN';
  return (
    <>
      <PageHeader title="Single call" subtitle="Enter a number and start the call immediately." />
      <ProviderBanner simulated={provider.data?.data.simulated} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <form onSubmit={handleSubmit(send)} noValidate className="card p-4 sm:p-6 space-y-5">
          <Input label="Phone number" type="tel" inputMode="tel" autoComplete="off" autoFocus placeholder="+91 98765 43210" error={errors.phone?.message} hint={`Default country: ${country}`} {...register('phone')} />
          <Button type="submit" icon={Phone} loading={isSubmitting} className="w-full sm:w-auto">Call now</Button>
          <p className="hint">The default language, voice and message are managed in Settings.</p>
        </form>
        <aside aria-live="polite">
          {active ? <div className="card p-4 space-y-3"><h2>Latest call</h2><div className="flex flex-wrap gap-2"><StatusBadge status={active.status} />{active.simulated && <SimulatedBadge />}</div><p className="text-sm">{active.phoneMasked}</p><p className="text-sm text-muted">Duration: {fmtDuration(active.durationSeconds)}</p>{active.failureReason && <p className="text-sm text-danger">{active.failureReason}</p>}</div> : <div className="card p-4 text-sm text-muted">Call status appears here after you start a call.</div>}
        </aside>
      </div>
    </>
  );
}
