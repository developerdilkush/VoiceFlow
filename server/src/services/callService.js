import { Call } from '../models/index.js';
import { AppError, ProviderError } from '../utils/errors.js';
import { normalizePhone, maskPhone } from '../utils/phone.js';
import { renderTemplate } from '../utils/template.js';
import { getProvider } from '../telephony/index.js';
import { resolveVoice, buildTwiml } from '../voice/voiceService.js';
import { assertCallAllowed, withinAllowedHours } from './safeguards.js';
import { getSettings } from './settingsService.js';
import { logger } from '../utils/logger.js';

const FRIENDLY = {
  PROVIDER_AUTH: 'The telephony provider rejected our credentials. Check the server configuration.',
  PROVIDER_RATE_LIMIT: 'The telephony provider rate limit was reached.',
  PROVIDER_NETWORK: 'Could not reach the telephony provider.',
  PROVIDER_ERROR: 'The telephony provider rejected the call request.',
};

export async function createSingleCall({ admin, settings, body, idempotencyKey }) {
  if (idempotencyKey) {
    const existing = await Call.findOne({ idempotencyKey });
    if (existing) return { call: existing, replay: true };
  }
  const phone = normalizePhone(body.phone, settings.defaultCountry);
  if (!phone) throw new AppError(422, 'INVALID_PHONE', 'Enter a valid phone number with a correct country code.');
  const language = settings.defaultLanguage;
  const voice = await resolveVoice(settings.defaultVoiceId, language);
  const message = renderTemplate(settings.defaultMessage, {});
  if (voice.type === 'tts' && !message.trim()) throw new AppError(422, 'EMPTY_MESSAGE', 'Message cannot be empty.');
  await assertCallAllowed(settings, phone);

  let call;
  try {
    call = await Call.create({
      name: '', phone, phoneMasked: maskPhone(phone), message, language,
      voiceId: voice.id, voiceLabel: voice.label, voiceType: voice.type, source: 'single',
      idempotencyKey: idempotencyKey || undefined, createdBy: admin._id,
    });
  } catch (e) {
    if (e.code === 11000 && idempotencyKey) return { call: await Call.findOne({ idempotencyKey }), replay: true };
    throw e;
  }
  const result = await dispatchCall(call._id);
  if (result.error) throw result.error;
  return { call: result.call || call };
}

const fail = (call, reason) =>
  Call.findOneAndUpdate({ _id: call._id, status: 'queued' }, { $set: { status: 'failed', failureReason: reason, completedAt: new Date() } }, { new: true });

/** Atomically claims a queued call and hands it to the provider. Never throws. */
export async function dispatchCall(callId) {
  const claimed = await Call.findOneAndUpdate({ _id: callId, status: 'queued', claimedAt: null }, { $set: { claimedAt: new Date() } }, { new: true }).select('+phone');
  if (!claimed) return { skipped: true };
  const call = claimed;
  const settings = await getSettings(call.createdBy);
  try {
    if (call.source === 'bulk') {
      if (!withinAllowedHours(settings)) {
        await Call.updateOne({ _id: call._id }, { $set: { claimedAt: null, nextAttemptAt: new Date(Date.now() + 5 * 60000) } });
        return { deferred: true };
      }
    }
    const voice = await resolveVoice(call.voiceId, call.language);
    const provider = getProvider();
    const r = await provider.initiateCall({ to: call.phone, twiml: buildTwiml(voice, call.message, call.language), callId: call.id });
    const now = new Date();
    await Call.updateOne({ _id: call._id }, { $set: { provider: provider.name, simulated: provider.simulated, initiatedAt: now }, $inc: { attempts: 1 } });
    await Call.updateOne({ _id: call._id, providerCallId: null }, { $set: { providerCallId: r.providerCallId } });
    await Call.updateOne({ _id: call._id, status: 'queued' }, { $set: { status: 'initiated' } });
    return { call: await Call.findById(call._id) };
  } catch (e) {
    const code = e instanceof ProviderError ? e.code : 'INTERNAL';
    if (e instanceof ProviderError && e.transient && call.source === 'bulk' && call.attempts < settings.retry.maxAttempts) {
      const delay = settings.retry.backoffSeconds * 1000 * 2 ** call.attempts;
      await Call.updateOne({ _id: call._id }, { $set: { claimedAt: null, nextAttemptAt: new Date(Date.now() + delay) }, $inc: { attempts: 1 } });
      return { retried: true };
    }
    logger.warn({ callId: call.id, code, msg: e.message }, 'call dispatch failed');
        const base = e instanceof AppError ? e.message : FRIENDLY[code] || 'Call could not be started.';
    const detail = e instanceof ProviderError && e.message ? ` [${e.status || 'no status'}: ${String(e.message).slice(0, 200)}]` : '';
    const reason = base + detail;
    const failed = await fail(call, reason);
    const status = code === 'PROVIDER_AUTH' ? 502 : code === 'PROVIDER_RATE_LIMIT' ? 429 : 502;
    return { call: failed, error: new AppError(status, code, reason) };
  }
}

export async function cancelCall(call) {
  if (call.status === 'queued') {
    const c = await Call.findOneAndUpdate({ _id: call._id, status: 'queued' }, { $set: { status: 'canceled', completedAt: new Date(), failureReason: 'Canceled by administrator' } }, { new: true });
    if (c) return c;
  }
  if (['initiated', 'ringing', 'answered'].includes(call.status) && call.providerCallId) {
    try { await getProvider().cancelCall(call.providerCallId); } catch { throw new AppError(502, 'CANCEL_FAILED', 'The provider could not cancel this call.'); }
    return Call.findById(call._id); // final status arrives through the provider webhook
  }
  throw new AppError(409, 'NOT_CANCELABLE', 'This call can no longer be canceled.');
}
