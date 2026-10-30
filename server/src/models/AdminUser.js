import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    passwordHash: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0 },
    timezone: { type: String, default: 'Asia/Kolkata' },
  },
  { timestamps: true }
);
export const AdminUser = mongoose.model('AdminUser', schema);
