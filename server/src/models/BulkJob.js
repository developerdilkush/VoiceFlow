import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: { type: String, default: '', maxlength: 100 },
    status: { type: String, enum: ['running', 'paused', 'completed', 'canceled'], default: 'running', index: true },
    mode: { type: String, enum: ['same', 'individual'], required: true },
    total: { type: Number, default: 0 },
    consent: { type: mongoose.Schema.Types.ObjectId, ref: 'ConsentRecord' },
    idempotencyKey: { type: String },
    finishedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true }
);
schema.index({ idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
export const BulkJob = mongoose.model('BulkJob', schema);
