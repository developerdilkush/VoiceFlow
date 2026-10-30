import { AlertTriangle } from 'lucide-react';

export const ProviderBanner = ({ simulated }) => simulated ? (
  <div role="status" className="flex gap-3 items-start rounded-card border border-warn/40 bg-warn/10 p-3 text-sm mb-6">
    <AlertTriangle className="h-5 w-5 text-warn shrink-0 mt-0.5" aria-hidden />
    <p><strong>Development mock provider is active.</strong> Calls shown as “Simulated” are not real telephone calls. Configure a real provider in the server <code>.env</code> to place real calls.</p>
  </div>
) : null;
