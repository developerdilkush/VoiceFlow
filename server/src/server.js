import { env, assertEnv } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';
import { startWorker } from './queue/worker.js';
import { setMockEventSink } from './telephony/mockAdapter.js';
import { applyStatusEvent } from './services/statusService.js';

assertEnv();
await connectDb();
if (env.provider === 'mock') {
  logger.warn('*** MOCK TELEPHONY PROVIDER ACTIVE – NO REAL PHONE CALLS WILL BE PLACED ***');
  setMockEventSink((e) => applyStatusEvent({ callId: e.callId }, e).catch((err) => logger.warn({ err: err.message }, 'mock event failed')));
}
startWorker();
const server = createApp().listen(env.port, () => logger.info(`VoiceFlow API listening on :${env.port} (provider: ${env.provider})`));
const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
