import { SuppressionEntry, audit } from '../models/index.js';
import { AppError, asyncHandler, ok } from '../utils/errors.js';
import { paging } from '../utils/misc.js';
import { normalizePhone, maskPhone } from '../utils/phone.js';
import { getSettings } from '../services/settingsService.js';

const view = (s) => ({ id: s.id, phoneMasked: s.phoneMasked, reason: s.reason, note: s.note, createdAt: s.createdAt });

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const [items, total] = await Promise.all([SuppressionEntry.find().sort({ createdAt: -1 }).skip(skip).limit(limit), SuppressionEntry.countDocuments()]);
  ok(res, items.map(view), { page, limit, total, pages: Math.ceil(total / limit) });
});

export const create = asyncHandler(async (req, res) => {
  const settings = await getSettings(req.user.id);
  const phone = normalizePhone(req.body.phone, settings.defaultCountry);
  if (!phone) throw new AppError(422, 'INVALID_PHONE', 'Enter a valid phone number.');
  const s = await SuppressionEntry.findOneAndUpdate({ phone }, { $setOnInsert: { phone, phoneMasked: maskPhone(phone), reason: req.body.reason, note: req.body.note, createdBy: req.user._id } }, { upsert: true, new: true });
  await audit(req, 'suppression.add', 'SuppressionEntry', s.id);
  ok(res, view(s), undefined, 201);
});

export const remove = asyncHandler(async (req, res) => {
  const s = await SuppressionEntry.findByIdAndDelete(req.params.id);
  if (!s) throw new AppError(404, 'NOT_FOUND', 'Entry not found.');
  await audit(req, 'suppression.remove', 'SuppressionEntry', s.id);
  ok(res, { deleted: true });
});
