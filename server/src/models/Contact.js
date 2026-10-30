import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 80, default: '' },
    phone: { type: String, required: true, unique: true, select: false }, // E.164
    phoneMasked: { type: String, required: true },
    language: { type: String, enum: ['hi', 'en'], default: 'en' },
    voiceId: { type: String, default: '' },
    consent: {
      status: { type: String, enum: ['confirmed', 'unknown', 'revoked'], default: 'unknown' },
      source: { type: String, enum: ['verbal', 'written', 'existing_relationship', 'other', ''], default: '' },
      at: Date,
    },
    notes: { type: String, maxlength: 500, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true }
);
schema.index({ name: 'text' });
schema.index({ createdAt: -1 });
export const Contact = mongoose.model('Contact', schema);
