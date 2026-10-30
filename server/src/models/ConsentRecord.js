import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    scope: { type: String, enum: ['single', 'bulk', 'contact'], required: true },
    recipientsCount: { type: Number, default: 1 },
    phoneMasked: { type: String, default: '' },
    source: { type: String, enum: ['verbal', 'written', 'existing_relationship', 'other'], required: true },
    note: { type: String, maxlength: 300, default: '' },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
export const ConsentRecord = mongoose.model('ConsentRecord', schema);
