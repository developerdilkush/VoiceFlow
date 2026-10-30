import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { globalLimiter } from './middleware/limiters.js';
import { csrfGuard } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import routes from './routes/index.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(pinoHttp({ logger, genReqId: (req, res) => { const id = crypto.randomUUID(); res.setHeader('X-Request-Id', id); return id; }, serializers: { req: (r) => ({ id: r.id, method: r.method, url: r.url.split('?')[0] }) } }));
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientOrigin, credentials: true, allowedHeaders: ['Content-Type', 'X-Requested-With', 'Idempotency-Key'] }));
  app.use(globalLimiter);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' })); // Twilio webhooks
  app.use(cookieParser());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/v1', csrfGuard, routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
