import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition } from '../src/utils/callStatus.js';
import { renderTemplate, escapeXml, csvSafe, toCsv } from '../src/utils/template.js';
import { inspectAudio } from '../src/utils/audio.js';

test('status transitions only move forward and terminal states are final', () => {
  assert.equal(canTransition('queued', 'initiated'), true);
  assert.equal(canTransition('initiated', 'ringing'), true);
  assert.equal(canTransition('ringing', 'answered'), true);
  assert.equal(canTransition('answered', 'completed'), true);
  assert.equal(canTransition('ringing', 'initiated'), false); // out-of-order webhook
  assert.equal(canTransition('completed', 'failed'), false);
  assert.equal(canTransition('busy', 'answered'), false);
  assert.equal(canTransition('queued', 'canceled'), true);
  assert.equal(canTransition('answered', 'answered'), false);
});

test('template placeholders use a safe fallback', () => {
  assert.equal(renderTemplate('Hello {{name}}!', { name: 'Asha' }), 'Hello Asha!');
  assert.equal(renderTemplate('Hello {{ NAME }}!', {}), 'Hello there!');
  assert.equal(renderTemplate('Hi {{other}}', { name: 'x' }), 'Hi {{other}}');
});

test('xml escaping protects TwiML', () => {
  assert.equal(escapeXml('<Hangup/> & "x"'), '&lt;Hangup/&gt; &amp; &quot;x&quot;');
});

test('csv export neutralises formula injection', () => {
  assert.equal(csvSafe('=HYPERLINK("x")'), "'=HYPERLINK(\"x\")");
  assert.equal(csvSafe('+919876543210'), '+919876543210');
  assert.equal(csvSafe('@cmd'), "'@cmd");
  assert.match(toCsv([{ a: 'x,y' }], [{ label: 'A', value: (r) => r.a }]), /"x,y"/);
});

function wav(seconds, rate = 8000) {
  const data = Buffer.alloc(seconds * rate * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

test('audio inspection reads real WAV duration and rejects non-audio', () => {
  const r = inspectAudio(wav(3));
  assert.equal(r.type, 'wav');
  assert.ok(Math.abs(r.duration - 3) < 0.01);
  assert.equal(inspectAudio(Buffer.from('MZ this is an exe renamed to .mp3'.repeat(10))), null);
});
