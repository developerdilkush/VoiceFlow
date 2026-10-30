import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ProviderError } from '../utils/errors.js';

/**
 * Exotel adapter (Connect API + Greeting-applet "read text from URL").
 * Flow: we dial the recipient (From) through your ExoPhone (CallerId) into a flow URL you created in the
 * Exotel dashboard. The flow's Greeting applet fetches the message text from
 *   GET {PUBLIC_BASE_URL}/api/v1/webhooks/exotel/message?k=<EXOTEL_SECRET>
 * Exotel passes our call id back as CustomField. Built from Exotel's public docs; not tested against a live account.
 */
const x = () => env.exotel;
const base = () => `https://${x().subdomain}/v1/Accounts/${x().sid}`;
const STATUS_MAP = { queued: 'initiated', 'in-progress': 'answered', completed: 'completed', failed: 'failed', busy: 'busy', 'no-answer': 'no_answer', canceled: 'canceled' };
const safeEq = (a, b) => { const A = Buffer.from(String(a || '')), B = Buffer.from(String(b || '')); return A.length === B.length && crypto.timingSafeEqual(A, B); };

async function exoFetch(path, { method = 'GET', form } = {}) {
  let res;
  try {
    res = await fetch(base() + path, {
      method,
      headers: { Authorization: 'Basic ' + Buffer.from(`${x().apiKey}:${x().apiToken}`).toString('base64'), Accept: 'application/json', ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
      body: form ? form.toString() : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch { throw new ProviderError('Could not reach the telephony provider.', { transient: true, code: 'PROVIDER_NETWORK' }); }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = res.status === 401 || res.status === 403 ? 'PROVIDER_AUTH' : res.status === 429 ? 'PROVIDER_RATE_LIMIT' : 'PROVIDER_ERROR';
    throw new ProviderError(body?.RestException?.Message || `Provider error (${res.status})`, { transient: res.status === 429 || res.status >= 500, code, status: res.status });
  }
  return body;
}

export const exotelAdapter = {
  name: 'exotel',
  simulated: false,
  // The voice/language is set in the Exotel flow's Greeting applet, not per call.
  capabilities: { perCallVoice: false, cancel: false, balance: false },

  async initiateCall({ to, callId }) {
    const form = new URLSearchParams({
      From: to, CallerId: x().callerId, Url: x().flowUrl, CustomField: String(callId),
      StatusCallback: `${env.publicBaseUrl}/api/v1/webhooks/exotel?cid=${callId}&k=${encodeURIComponent(x().secret)}`,
      StatusCallbackContentType: 'application/json',
    });

    const r = await exoFetch('/Calls/connect.json', { method: 'POST', form });
    const sid = r?.Call?.Sid;
    if (!sid) throw new ProviderError('Unexpected provider response.', { code: 'PROVIDER_ERROR' });
    return { providerCallId: sid, status: 'initiated' };
  },

  async getCallStatus(providerCallId) {
    const r = await exoFetch(`/Calls/${providerCallId}.json`);
    return { status: STATUS_MAP[r?.Call?.Status] || 'initiated', duration: Number(r?.Call?.Duration || 0) };
  },

  async cancelCall() { throw new ProviderError('Canceling an in-progress call is not supported with Exotel.', { code: 'CANCEL_UNSUPPORTED' }); },

  /** Exotel does not sign webhooks, so we require a shared secret in the callback URL. */
  validateWebhook(req) { return !!x().secret && safeEq(req.query?.k, x().secret); },
  validateMessageRequest(req) { return !!x().secret && safeEq(req.query?.k, x().secret); },

  normalizeWebhookEvent(body, query = {}) {
    const raw = body?.Status;
    let status = STATUS_MAP[raw];
    if (body?.EventType === 'answered') status = 'answered';
    if (!status || !body?.CallSid) return null;
    const leg = Array.isArray(body.Legs) ? body.Legs[0] : undefined; // leg 0 = the recipient
    return {
      eventId: `${body.CallSid}:${body.EventType || 'terminal'}:${raw}`,
      providerCallId: body.CallSid,
      callId: body.CustomField || query.cid,
      status,
      duration: leg?.OnCallDuration !== undefined ? Number(leg.OnCallDuration) : undefined,
    };
  },

  async validateConfig() {
    try { await exoFetch('/Calls.json?PageSize=1'); return { ok: true, detail: 'Exotel credentials accepted' }; }
    catch (e) { return { ok: false, detail: e.code === 'PROVIDER_AUTH' ? 'Exotel rejected the API key/token' : e.message }; }
  },
  async getBalance() { return null; },
};
