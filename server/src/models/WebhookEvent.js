import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    eventKey: { type: String, required: true, unique: true }, // deduplication
    provider: String,
    providerCallId: String,
    status: String,
    applied: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
export const WebhookEvent = mongoose.model('WebhookEvent', schema);
