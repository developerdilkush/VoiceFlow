import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginLimiter, callLimiter, uploadLimiter, webhookLimiter } from '../middleware/limiters.js';
import * as V from '../validators/index.js';
import * as auth from '../controllers/authController.js';
import * as dash from '../controllers/dashboardController.js';
import * as calls from '../controllers/callsController.js';
import * as bulk from '../controllers/bulkController.js';
import * as voices from '../controllers/voicesController.js';
import * as reports from '../controllers/reportsController.js';
import * as settings from '../controllers/settingsController.js';
import * as webhooks from '../controllers/webhookController.js';

const sheetUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
const r = Router();

// Public
r.post('/auth/login', loginLimiter, validate(V.loginSchema), auth.login);
r.post('/auth/logout', auth.logout);
// The Exotel Greeting applet probes a dynamic-message URL with HEAD and then
// reads it with GET. Register both explicitly so they have the same response.
r.route('/webhooks/exotel/message').get(webhookLimiter, webhooks.exotelMessage).head(webhookLimiter, webhooks.exotelMessage);
r.post('/webhooks/:provider', webhookLimiter, webhooks.handle);

// Everything below requires an authenticated administrator
r.use(requireAuth);
r.get('/auth/me', auth.me);
r.post('/auth/change-password', validate(V.changePasswordSchema), auth.changePassword);
r.post('/auth/revoke-sessions', auth.revokeSessions);
r.get('/auth/activity', auth.activity);

r.get('/dashboard/stats', dash.stats);
r.get('/dashboard/recent-calls', dash.recentCalls);

r.get('/calls/export', calls.exportCsv);
r.post('/calls', callLimiter, validate(V.singleCallSchema), calls.create);
r.get('/calls', calls.list);
r.get('/calls/:id', calls.get);
r.post('/calls/:id/cancel', calls.cancel);

r.post('/bulk/import', uploadLimiter, sheetUpload.single('file'), bulk.importRecipients);
r.post('/bulk/jobs', callLimiter, validate(V.bulkJobSchema), bulk.createJob);
r.get('/bulk/jobs', bulk.listJobs);
r.get('/bulk/jobs/:id', bulk.getJob);
r.get('/bulk/jobs/:id/export', bulk.exportResults);
r.post('/bulk/jobs/:id/pause', bulk.pause);
r.post('/bulk/jobs/:id/resume', bulk.resume);
r.post('/bulk/jobs/:id/cancel', bulk.cancel);

r.get('/voices', voices.list);

r.get('/reports/calls', reports.calls);
r.get('/reports/usage', reports.usage);

r.get('/settings', settings.get);
r.put('/settings', validate(V.settingsSchema), settings.update);
r.patch('/settings/profile', validate(V.profileSchema), settings.updateProfile);
r.get('/settings/provider', settings.providerStatus);

export default r;
