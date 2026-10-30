export const renderTemplate = (msg, name, fallback = 'there') => String(msg || '').replace(/\{\{\s*name\s*\}\}/gi, () => (name || '').trim() || fallback);
