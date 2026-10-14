export type VideoPermitido = { tipo: 'youtube' | 'tiktok'; url: string };

/** Política común de enlaces guardables y reproducibles por la galería. */
export function prepararVideoPermitido(value: string): VideoPermitido | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;

    if (['tiktok.com', 'www.tiktok.com'].includes(url.hostname)) {
      if (/^\/@[^/]+\/video\/\d+\/?$/.test(url.pathname)) {
        return { tipo: 'tiktok', url: url.href };
      }
      return null;
    }
    if (['vm.tiktok.com', 'vt.tiktok.com'].includes(url.hostname)) {
      if (/^\/[\w-]+\/?$/.test(url.pathname)) {
        return { tipo: 'tiktok', url: url.href };
      }
      return null;
    }

    let id: string | null = null;
    if (url.hostname === 'youtu.be') id = url.pathname.match(/^\/([^/]+)\/?$/)?.[1] ?? null;
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      id = url.pathname === '/watch'
        ? url.searchParams.get('v')
        : url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)\/?$/)?.[1] ?? null;
    }
    return id && /^[\w-]{11}$/.test(id)
      ? { tipo: 'youtube', url: `https://www.youtube.com/embed/${id}?autoplay=1` }
      : null;
  } catch {
    return null;
  }
}
