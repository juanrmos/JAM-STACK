const mimeByExtension: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function actualizarFavicon(url: string): void {
  let imageUrl: URL;
  try {
    imageUrl = new URL(url, window.location.href);
  } catch {
    return;
  }

  if (!['https:', 'http:'].includes(imageUrl.protocol)) return;

  const extension = imageUrl.pathname.split('.').pop()?.toLowerCase() || '';
  const mime = mimeByExtension[extension];
  const iconLinks = document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]');
  if (!iconLinks.length) return;

  iconLinks.forEach((iconLink) => {
    iconLink.href = imageUrl.href;
    if (mime) iconLink.type = mime;
    else iconLink.removeAttribute('type');
  });
}
