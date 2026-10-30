import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', unique: true, required: true },
    defaultLanguage: { type: String, enum: ['hi', 'en'], default: 'en' },
    defaultVoiceId: { type: String, default: 'tts:polly-aditi' },
    defaultMessage: { type: String, default: 'Hello. This is an automated call from VoiceFlow.', maxlength: 500 },
    theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
    dashboardRangeDays: { type: Number, default: 30, min: 1, max: 365 },
    defaultCountry: { type: String, default: 'IN', maxlength: 2 },
    maxCallsPerOperation: { type: Number, default: 100, min: 1 },
    maxDailyCalls: { type: Number, default: 200, min: 1 },
    minRepeatIntervalMinutes: { type: Number, default: 60, min: 0 },
    allowedHours: { start: { type: Number, default: 9, min: 0, max: 23 }, end: { type: Number, default: 20, min: 1, max: 24 } },
    retry: { maxAttempts: { type: Number, default: 2, min: 0, max: 5 }, backoffSeconds: { type: Number, default: 60, min: 10 } },
    timezone: { type: String, default: 'Asia/Kolkata' },
    costPerMinute: { type: Number, default: null, min: 0 },
    currency: { type: String, default: 'INR' },
    requireConsent: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const UserSettings = mongoose.model('UserSettings', schema);
