import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, select: false },
    phoneMasked: { type: String, required: true },
    reason: { type: String, enum: ['opt_out', 'complaint', 'invalid', 'manual'], default: 'manual' },
    note: { type: String, maxlength: 200, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
export const SuppressionEntry = mongoose.model('SuppressionEntry', schema);
