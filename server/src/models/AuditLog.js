import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    action: { type: String, required: true, index: true },
    entity: String,
    entityId: String,
    ip: String,
    userAgent: { type: String, maxlength: 300 },
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
schema.index({ actor: 1, createdAt: -1 });
export const AuditLog = mongoose.model('AuditLog', schema);

export async function audit(req, action, entity, entityId, meta) {
  try {
    await AuditLog.create({ actor: req.user?._id, action, entity, entityId: entityId ? String(entityId) : undefined, ip: req.ip, userAgent: req.get('user-agent'), meta });
  } catch { /* auditing must never break the request */ }
}
