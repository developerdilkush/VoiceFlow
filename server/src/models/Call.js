import mongoose from 'mongoose';
import { CALL_STATUSES } from '../utils/callStatus.js';

const schema = new mongoose.Schema(
  {
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    name: { type: String, default: '', maxlength: 80 },
    phone: { type: String, required: true, select: false }, // E.164 (needed to place the call)
    phoneMasked: { type: String, required: true },
    message: { type: String, default: '', maxlength: 1000 },
    language: { type: String, enum: ['hi', 'en'], required: true },
    voiceId: { type: String, required: true },
    voiceLabel: { type: String, default: '' },
    voiceType: { type: String, enum: ['tts', 'recording'], required: true },
    provider: { type: String, default: '' },
    providerCallId: { type: String, index: true, sparse: true },
    simulated: { type: Boolean, default: false },
    status: { type: String, enum: CALL_STATUSES, default: 'queued', index: true },
    durationSeconds: { type: Number, default: 0 },
    initiatedAt: Date,
    answeredAt: Date,
    completedAt: Date,
    failureReason: { type: String, default: '' },
    source: { type: String, enum: ['single', 'bulk'], required: true },
    bulkJob: { type: mongoose.Schema.Types.ObjectId, ref: 'BulkJob' },
    consent: { type: mongoose.Schema.Types.ObjectId, ref: 'ConsentRecord' },
    idempotencyKey: { type: String },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: () => new Date() },
    claimedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true }
);
schema.index({ createdAt: -1 });
schema.index({ bulkJob: 1, status: 1 });
schema.index({ status: 1, nextAttemptAt: 1 });
schema.index({ contact: 1 });
schema.index({ phone: 1, createdAt: -1 });
schema.index({ idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
export const Call = mongoose.model('Call', schema);
