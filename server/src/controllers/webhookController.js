import { Call, WebhookEvent } from '../models/index.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { getProvider, getProviderByName } from '../telephony/index.js';
import { applyStatusEvent } from '../services/statusService.js';
import { signedAudioUrl } from '../voice/voiceService.js';
import { logger } from '../utils/logger.js';

export const handle = asyncHandler(async (req, res) => {
  const provider = getProviderByName(req.params.provider);
  if (!provider || provider.name !== getProvider().name) throw new AppError(404, 'NOT_FOUND', 'Unknown provider.');
  if (!provider.validateWebhook(req)) throw new AppError(403, 'BAD_SIGNATURE', 'Invalid webhook signature.');
  const evt = provider.normalizeWebhookEvent(req.body, req.query);
  if (!evt) return res.status(200).send('ignored');
  try {
    await WebhookEvent.create({ eventKey: `${provider.name}:${evt.eventId}`, provider: provider.name, providerCallId: evt.providerCallId, status: evt.status });
  } catch (e) {
    if (e.code === 11000) return res.status(200).send('duplicate'); // provider retry – already processed
    throw e;
  }
  const r = await applyStatusEvent({ callId: evt.callId, providerCallId: evt.providerCallId }, evt);
  await WebhookEvent.updateOne({ eventKey: `${provider.name}:${evt.eventId}` }, { applied: r.applied });
  logger.info({ status: evt.status, applied: r.applied, reason: r.reason }, 'webhook processed');
  res.status(200).send('ok');
});

/** Exotel Greeting applet ("read text from URL") fetches the message for a call here. GET and HEAD must return identical headers. */
export const exotelMessage = asyncHandler(async (req, res) => {
  const p = getProvider();
  if (p.name !== 'exotel') throw new AppError(404, 'NOT_FOUND', 'Not found.');
  if (!p.validateMessageRequest(req)) throw new AppError(403, 'FORBIDDEN', 'Forbidden.');
  // Exotel sends CustomField to both the GET and HEAD request it makes for a
  // dynamic Greeting applet. `cid` is useful when exercising the endpoint
  // manually, but a real call must still be correlated through CustomField.
  const id = String(req.query.CustomField || req.query.cid || '');
  let call = /^[a-f0-9]{24}$/i.test(id) ? await Call.findById(id) : null;
  if (!call && req.query.CallSid) call = await Call.findOne({ providerCallId: String(req.query.CallSid) });
  logger.info({ method: req.method, hasCustomField: !!req.query.CustomField, hasCallSid: !!req.query.CallSid, found: !!call, callStatus: call?.status, paramKeys: Object.keys(req.query).filter((k) => k !== 'k') }, 'exotel message request');
  const live = call && ['queued', 'initiated', 'ringing', 'answered'].includes(call.status) && Date.now() - call.createdAt.getTime() < 6 * 3600 * 1000;
  if (!live) throw new AppError(404, 'NOT_FOUND', 'Not found.');
  const body = call.voiceType === 'recording' ? signedAudioUrl(call.voiceId.slice(4)) : call.message;
  // Exotel verifies the URL with HEAD before (or while) fetching it with GET.
  // Keep the headers byte-for-byte equivalent and do not append Express's
  // default charset to the Content-Type value.
  const payload = Buffer.from(body, 'utf8');
  res.status(200).set({ 'Content-Type': 'text/plain', 'Content-Length': String(payload.length) });
  res.end(req.method === 'HEAD' ? undefined : payload);
});
