import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ProviderError } from '../utils/errors.js';

const BASE = 'https://api.twilio.com/2010-04-01/Accounts';
const STATUS_MAP = { queued: 'initiated', initiated: 'initiated', ringing: 'ringing', 'in-progress': 'answered', completed: 'completed', busy: 'busy', 'no-answer': 'no_answer', failed: 'failed', canceled: 'canceled' };

async function twilioFetch(path, { method = 'GET', form } = {}) {
  const { sid, token } = env.twilio;
  let res;
  try {
    res = await fetch(`${BASE}/${sid}${path}`, {
      method,
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
      body: form ? form.toString() : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    throw new ProviderError('Could not reach the telephony provider.', { transient: true, code: 'PROVIDER_NETWORK' });
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const transient = res.status === 429 || res.status >= 500;
    const code = res.status === 401 ? 'PROVIDER_AUTH' : res.status === 429 ? 'PROVIDER_RATE_LIMIT' : 'PROVIDER_ERROR';
    throw new ProviderError(body.message || `Provider error (${res.status})`, { transient, code, status: res.status });
  }
  return body;
}

export const twilioAdapter = {
  name: 'twilio',
  simulated: false,

  async initiateCall({ to, twiml, callId }) {
    const form = new URLSearchParams({ To: to, From: env.twilio.from, Twiml: twiml, StatusCallback: `${env.publicBaseUrl}/api/v1/webhooks/twilio?cid=${callId}`, StatusCallbackMethod: 'POST' });
    for (const ev of ['initiated', 'ringing', 'answered', 'completed']) form.append('StatusCallbackEvent', ev);
    const r = await twilioFetch('/Calls.json', { method: 'POST', form });
    return { providerCallId: r.sid, status: STATUS_MAP[r.status] || 'initiated' };
  },

  async getCallStatus(providerCallId) {
    const r = await twilioFetch(`/Calls/${providerCallId}.json`);
    return { status: STATUS_MAP[r.status] || 'initiated', duration: Number(r.duration || 0) };
  },

  async cancelCall(providerCallId) {
    // "canceled" works for queued/ringing calls; "completed" hangs up an in-progress call.
    const current = await this.getCallStatus(providerCallId);
    const target = current.status === 'answered' ? 'completed' : 'canceled';
    await twilioFetch(`/Calls/${providerCallId}.json`, { method: 'POST', form: new URLSearchParams({ Status: target }) });
  },

  /** Verifies X-Twilio-Signature (HMAC-SHA1 of full URL + sorted POST params). */
  validateWebhook(req) {
    const header = req.get('x-twilio-signature');
    if (!header || !env.twilio.token) return false;
    const url = env.publicBaseUrl + req.originalUrl;
    const body = req.body || {};
    const data = url + Object.keys(body).sort().reduce((acc, k) => acc + k + body[k], '');
    const expected = crypto.createHmac('sha1', env.twilio.token).update(data, 'utf8').digest('base64');
    const a = Buffer.from(header), b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  },

  normalizeWebhookEvent(body, query = {}) {
    const status = STATUS_MAP[body.CallStatus];
    if (!status || !body.CallSid) return null;
    return {
      eventId: `${body.CallSid}:${body.CallStatus}:${body.SequenceNumber || ''}`,
      providerCallId: body.CallSid,
      callId: query.cid,
      status,
      duration: body.CallDuration !== undefined ? Number(body.CallDuration) : undefined,
      reason: status === 'failed' ? 'Provider reported the call as failed' : undefined,
    };
  },

  async validateConfig() {
    const r = await twilioFetch('.json');
    return { ok: r.status === 'active', detail: `Account status: ${r.status}` };
  },

  async getBalance() {
    const r = await twilioFetch('/Balance.json');
    return { balance: Number(r.balance), currency: r.currency };
  },
};
