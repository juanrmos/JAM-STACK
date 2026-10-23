export function actualizarFavicon(url: string): void {
  let imageUrl: URL;
  try {
    imageUrl = new URL(url, window.location.href);
  } catch {
    return;
  }

  if (!['https:', 'http:'].includes(imageUrl.protocol)) return;

  const iconLinks = document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]');
  if (!iconLinks.length) return;

  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.addEventListener('load', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.fillStyle = '#12262a';
    context.fillRect(0, 0, 64, 64);
    context.strokeStyle = '#d9a520';
    context.lineWidth = 2;
    context.strokeRect(1, 1, 62, 62);

    const padding = 8;
    const scale = Math.min((64 - padding * 2) / image.naturalWidth, (64 - padding * 2) / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (64 - width) / 2, (64 - height) / 2, width, height);

    try {
      const faviconUrl = canvas.toDataURL('image/png');
      iconLinks.forEach((iconLink) => {
        iconLink.href = faviconUrl;
        iconLink.type = 'image/png';
        iconLink.sizes = '64x64';
      });
    } catch {
      // Si el servidor no permite canvas por CORS, conserva el favicon estático.
    }
  }, { once: true });
  image.src = imageUrl.href;
}
