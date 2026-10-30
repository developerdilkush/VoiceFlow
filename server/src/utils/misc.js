export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function paging(q) {
  const page = Math.max(1, parseInt(q.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}
export function dateRange(q, defaultDays = 30) {
  const to = q.to ? new Date(q.to) : new Date();
  const from = q.from ? new Date(q.from) : new Date(to.getTime() - defaultDays * 86400000);
  if (Number.isNaN(+from) || Number.isNaN(+to)) return { from: new Date(Date.now() - defaultDays * 86400000), to: new Date() };
  if (q.to && String(q.to).length <= 10) to.setHours(23, 59, 59, 999);
  return { from, to };
}
