import { asyncHandler, ok } from '../utils/errors.js';
import { dateRange } from '../utils/misc.js';
import { toCsv } from '../utils/template.js';
import { getSettings } from '../services/settingsService.js';
import { callMetrics } from './dashboardController.js';

export const calls = asyncHandler(async (req, res) => {
  const settings = await getSettings(req.user.id);
  const { from, to } = dateRange(req.query, 30);
  const m = await callMetrics(from, to, settings.timezone);
  if (req.query.format === 'csv') {
    const csv = toCsv(m.daily, [{ label: 'Date', value: (d) => d.date }, { label: 'Total', value: (d) => d.total }, { label: 'Answered', value: (d) => d.answered }, { label: 'Failed/Busy/No answer', value: (d) => d.failed }]);
    return res.type('text/csv').set('Content-Disposition', 'attachment; filename="call-report.csv"').send(csv);
  }
  ok(res, { ...m, range: { from, to } });
});

export const usage = asyncHandler(async (req, res) => {
  const settings = await getSettings(req.user.id);
  const { from, to } = dateRange(req.query, 30);
  const m = await callMetrics(from, to, settings.timezone);
  ok(res, { totalDurationSeconds: m.totalDurationSeconds, billableMinutes: m.billableMinutes, estimatedCost: settings.costPerMinute != null ? Math.round(m.billableMinutes * settings.costPerMinute * 100) / 100 : null, currency: settings.currency, bySource: m.bySource, range: { from, to } });
});
