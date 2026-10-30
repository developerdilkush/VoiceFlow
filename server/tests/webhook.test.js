import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.TWILIO_AUTH_TOKEN = 'test-token';
process.env.PUBLIC_BASE_URL = 'https://example.test';
const { twilioAdapter } = await import('../src/telephony/twilioAdapter.js');

const body = { CallSid: 'CA123', CallStatus: 'completed', CallDuration: '12', SequenceNumber: '3' };
const originalUrl = '/api/v1/webhooks/twilio?cid=abc';
const sign = (b, token = 'test-token') => crypto.createHmac('sha1', token).update('https://example.test' + originalUrl + Object.keys(b).sort().map((k) => k + b[k]).join('')).digest('base64');
const req = (sig, b = body) => ({ originalUrl, body: b, get: (h) => (h.toLowerCase() === 'x-twilio-signature' ? sig : undefined) });

test('accepts a correctly signed webhook', () => assert.equal(twilioAdapter.validateWebhook(req(sign(body))), true));
test('rejects wrong signature, tampered body and missing header', () => {
  assert.equal(twilioAdapter.validateWebhook(req(sign(body, 'other-token'))), false);
  assert.equal(twilioAdapter.validateWebhook(req(sign(body), { ...body, CallStatus: 'failed' })), false);
  assert.equal(twilioAdapter.validateWebhook(req(undefined)), false);
});
test('normalises provider events and builds a dedup id', () => {
  const e = twilioAdapter.normalizeWebhookEvent(body, { cid: 'abc' });
  assert.deepEqual([e.status, e.duration, e.callId, e.eventId], ['completed', 12, 'abc', 'CA123:completed:3']);
  assert.equal(twilioAdapter.normalizeWebhookEvent({ CallSid: 'x', CallStatus: 'no-answer' }).status, 'no_answer');
  assert.equal(twilioAdapter.normalizeWebhookEvent({ CallSid: 'x', CallStatus: 'in-progress' }).status, 'answered');
});
