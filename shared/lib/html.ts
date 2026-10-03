export function escapeHtml(value: unknown) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)); }
export function safeUrl(value: unknown) { try { const url = new URL(String(value)); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } }
