import crypto from 'node:crypto';
import { env } from '../config/env.js';

/** DEVELOPMENT ONLY. Places NO real phone calls. Calls created through it are flagged `simulated`. */
let onEvent = null;
export const setMockEventSink = (fn) => { onEvent = fn; };
const timers = new Map();

export const mockAdapter = {
  name: 'mock',
  simulated: true,
  async initiateCall({ callId }) {
    if (env.isProd) throw new Error('Mock provider cannot be used in production');
    const providerCallId = 'MOCK' + crypto.randomBytes(8).toString('hex');
    const steps = [[1500, 'ringing'], [4000, 'answered'], [9000, 'completed', 5]];
    const list = steps.map(([ms, status, duration]) => {
      const t = setTimeout(() => onEvent?.({ callId, providerCallId, status, duration }), ms);
      t.unref?.();
      return t;
    });
    timers.set(providerCallId, list);
    return { providerCallId, status: 'initiated' };
  },
  async getCallStatus() { return { status: 'completed', duration: 5 }; },
  async cancelCall(id) { (timers.get(id) || []).forEach(clearTimeout); },
  validateWebhook() { return false; },
  normalizeWebhookEvent() { return null; },
  async validateConfig() { return { ok: true, detail: 'MOCK provider – no real calls are placed' }; },
  async getBalance() { return null; },
};
