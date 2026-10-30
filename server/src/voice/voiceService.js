import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { escapeXml } from '../utils/template.js';
import { getTtsVoice, LANG_CODE } from './catalog.js';

const sign = (id, exp) => crypto.createHmac('sha256', env.jwtSecret).update(`${id}.${exp}`).digest('hex');

export function signedAudioUrl(recordingId, ttlSeconds = 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${env.publicBaseUrl}/api/v1/voices/public/${recordingId}?exp=${exp}&sig=${sign(recordingId, exp)}`;
}

export function verifyAudioSignature(id, exp, sig) {
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const a = Buffer.from(String(sig)), b = Buffer.from(sign(id, exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Resolves a voice id ("tts:..." or "rec:<id>") and validates it against the message language. */
export async function resolveVoice(voiceId, language) {
  if (voiceId?.startsWith('tts:')) {
    const v = getTtsVoice(voiceId);
    if (!v) throw new AppError(422, 'UNSUPPORTED_VOICE', 'This voice is not supported.');
    if (!v.languages.includes(language)) throw new AppError(422, 'VOICE_LANGUAGE_MISMATCH', `${v.label} does not support the selected language.`);
    return { id: v.id, label: v.label, type: 'tts', twilioVoice: v.twilioVoice };
  }
  throw new AppError(422, 'UNSUPPORTED_VOICE', 'Select a supported built-in voice.');
}

/** TwiML played when the recipient answers. Message text is XML-escaped. */
export function buildTwiml(voice, message, language) {
  return `<Response><Pause length="1"/><Say voice="${voice.twilioVoice}" language="${LANG_CODE[language]}">${escapeXml(message)}</Say></Response>`;
}
