import mongoose from 'mongoose';
import { env } from '../config/env.js';

// Removes data for pages that are no longer part of the product:
// Contacts, Voice Library, and Suppression List.
// Call history, bulk jobs, accounts, settings, audit logs, and webhooks are retained.
if (!env.mongoUri) throw new Error('MONGODB_URI is required.');

await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
const db = mongoose.connection.db;
const names = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name));
const obsolete = ['contacts', 'voicerecordings', 'suppressionentries'];
for (const name of obsolete) {
  if (names.has(name)) {
    await db.dropCollection(name);
    console.log(`Dropped ${name}`);
  }
}

await db.collection('calls').updateMany({}, { $unset: { contact: '' } });
await db.collection('usersettings').updateMany({ $or: [{ defaultMessage: { $exists: false } }, { defaultMessage: '' }] }, { $set: { defaultMessage: 'Hello. This is an automated call from VoiceFlow.' } });
await db.collection('usersettings').updateMany({ defaultVoiceId: { $regex: '^rec:' } }, { $set: { defaultVoiceId: 'tts:polly-aditi' } });
console.log('Legacy feature cleanup completed.');
await mongoose.disconnect();
