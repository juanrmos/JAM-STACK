export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!);
}

export function imageSrc(value: unknown): string {
  const src = String(value ?? '');
  return /^(https?:\/\/|\/)/i.test(src) && !src.startsWith('//') ? escapeHtml(src) : '';
}
