import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, maskPhone } from '../src/utils/phone.js';

test('normalises Indian numbers to E.164', () => {
  assert.equal(normalizePhone('98290 12345', 'IN'), '+919829012345');
  assert.equal(normalizePhone('+91 98290-12345'), '+919829012345');
});
test('rejects invalid numbers without throwing', () => {
  assert.equal(normalizePhone('12345', 'IN'), null);
  assert.equal(normalizePhone('abc'), null);
  assert.equal(normalizePhone(''), null);
});
test('masks numbers', () => {
  assert.match(maskPhone('+919829012345'), /^\+91•+2345$/);
});
