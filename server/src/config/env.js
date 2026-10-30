import 'dotenv/config';
import path from 'node:path';

const e = process.env;
const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);

export const env = {
  nodeEnv: e.NODE_ENV || 'development',
  isProd: e.NODE_ENV === 'production',
  isTest: e.NODE_ENV === 'test',
  port: num(e.PORT, 5000),
  mongoUri: e.MONGODB_URI,
  jwtSecret: e.JWT_SECRET,
  jwtExpiresIn: e.JWT_EXPIRES_IN || '8h',
  clientOrigin: (e.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/$/, ''),
  cookieSameSite: e.COOKIE_SAMESITE || 'lax',
  publicBaseUrl: (e.PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  provider: e.TELEPHONY_PROVIDER || 'mock',
  twilio: { sid: e.TWILIO_ACCOUNT_SID, token: e.TWILIO_AUTH_TOKEN, from: e.TWILIO_FROM_NUMBER },
  exotel: { sid: e.EXOTEL_ACCOUNT_SID, apiKey: e.EXOTEL_API_KEY, apiToken: e.EXOTEL_API_TOKEN, subdomain: (e.EXOTEL_SUBDOMAIN || 'api.exotel.com').replace(/^https?:\/\//, '').replace(/\/$/, ''), callerId: e.EXOTEL_CALLER_ID, flowUrl: e.EXOTEL_FLOW_URL, secret: e.EXOTEL_SECRET },
  hardMaxPerOperation: num(e.HARD_MAX_CALLS_PER_OPERATION, 500),
  hardMaxDaily: num(e.HARD_MAX_DAILY_CALLS, 1000),
  bulkConcurrency: num(e.BULK_CONCURRENCY, 3),
  bulkCallsPerMinute: num(e.BULK_CALLS_PER_MINUTE, 20),
  retentionDays: num(e.RETENTION_DAYS, 90),
  maxAudioBytes: num(e.MAX_AUDIO_MB, 5) * 1024 * 1024,
  maxAudioSeconds: num(e.MAX_AUDIO_SECONDS, 60),
  uploadDir: path.resolve(e.UPLOAD_DIR || './uploads'),
};

export function assertEnv() {
  const problems = [];
  if (!env.mongoUri) problems.push('MONGODB_URI is required');
  if (!env.jwtSecret || env.jwtSecret.length < 32) problems.push('JWT_SECRET must be at least 32 characters');
  if (!['mock', 'twilio', 'exotel'].includes(env.provider)) problems.push('TELEPHONY_PROVIDER must be "mock", "twilio" or "exotel"');
  if (env.isProd && env.provider === 'mock') problems.push('The mock provider is disabled in production');
  if (env.provider === 'twilio' && !(env.twilio.sid && env.twilio.token && env.twilio.from))
    problems.push('Twilio credentials (SID, token, from number) are required when TELEPHONY_PROVIDER=twilio');
  if (env.provider === 'exotel') {
    const x = env.exotel;
    if (!(x.sid && x.apiKey && x.apiToken && x.callerId && x.flowUrl)) problems.push('Exotel needs EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_CALLER_ID and EXOTEL_FLOW_URL');
    if (!x.secret || x.secret.length < 20) problems.push('EXOTEL_SECRET must be at least 20 random characters');
  }
  if (['twilio', 'exotel'].includes(env.provider) && !env.publicBaseUrl) problems.push('PUBLIC_BASE_URL is required for webhooks');
  if (problems.length) throw new Error('Invalid configuration:\n - ' + problems.join('\n - '));
}
