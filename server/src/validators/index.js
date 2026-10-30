import { z } from 'zod';

const lang = z.enum(['hi', 'en']);
const phone = z.string().trim().min(5, 'Enter a phone number').max(25);
const consentSource = z.enum(['verbal', 'written', 'existing_relationship', 'other']);
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(200) });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(10, 'Use at least 10 characters').max(200) });

export const singleCallSchema = z.object({
  phone,
});

export const contactSchema = z.object({
  name: z.string().trim().max(80).optional().default(''),
  phone,
  language: lang.optional().default('en'),
  voiceId: z.string().optional().default(''),
  consentStatus: z.enum(['confirmed', 'unknown', 'revoked']).optional().default('unknown'),
  consentSource: consentSource.optional(),
  notes: z.string().max(500).optional().default(''),
});
export const contactUpdateSchema = contactSchema.partial();

export const suppressionSchema = z.object({ phone, reason: z.enum(['opt_out', 'complaint', 'invalid', 'manual']).default('manual'), note: z.string().max(200).optional().default('') });

const recipient = z.object({
  name: z.string().max(80).optional().default(''),
  phone: z.string().max(25),
});
export const bulkImportJsonSchema = z.object({ rows: z.array(z.object({ name: z.string().optional(), phone: z.string().optional(), message: z.string().optional(), language: z.string().optional(), voice: z.string().optional() })).min(1).max(5000) });
export const bulkJobSchema = z.object({
  recipients: z.array(recipient).min(1).max(5000),
});

export const settingsSchema = z.object({
  defaultLanguage: lang, defaultVoiceId: z.string(), defaultMessage: z.string().trim().min(1).max(500), theme: z.enum(['system', 'light', 'dark']),
  dashboardRangeDays: z.number().int().min(1).max(365),
  defaultCountry: z.string().length(2).toUpperCase(),
  maxCallsPerOperation: z.number().int().min(1), maxDailyCalls: z.number().int().min(1),
  minRepeatIntervalMinutes: z.number().int().min(0).max(10080),
  allowedHours: z.object({ start: z.number().int().min(0).max(23), end: z.number().int().min(1).max(24) }).refine((h) => h.end > h.start, 'End hour must be after start hour'),
  retry: z.object({ maxAttempts: z.number().int().min(0).max(5), backoffSeconds: z.number().int().min(10).max(3600) }),
  timezone: z.string().refine((tz) => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; } }, 'Unknown time zone'),
  costPerMinute: z.number().min(0).nullable(), currency: z.string().max(5),
  requireConsent: z.boolean(),
}).partial();
export const profileSchema = z.object({ displayName: z.string().trim().min(1).max(80), email: z.string().trim().email().max(254), timezone: z.string().max(60) }).partial();
