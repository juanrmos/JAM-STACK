export function validarApiBase(value: string | undefined, mode: string): string {
  if (!value) throw new Error('Falta PUBLIC_API_BASE_URL. Consulta .env.example.');
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('PUBLIC_API_BASE_URL debe ser una URL HTTP(S) sin credenciales ni parámetros.');
  }
  if (mode === 'development' && !local) throw new Error('El modo development requiere una API local.');
  if (mode === 'production' && (local || url.protocol !== 'https:')) {
    throw new Error('El build de producción requiere una API HTTPS remota.');
  }
  return url.href.replace(/\/$/, '');
}
