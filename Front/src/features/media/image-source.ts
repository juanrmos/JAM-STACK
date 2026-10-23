const generations = new WeakMap<HTMLImageElement, number>();

function decodificar(image: HTMLImageElement): Promise<void> {
  const ready = typeof image.decode === 'function'
    ? image.decode()
    : new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
    });
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    const timer = window.setTimeout(() => finish(new Error('Tiempo agotado al cargar la imagen.')), 5000);
    ready.then(() => finish(), finish);
  });
}

/** Preloads and decodes an image before replacing the visible source. */
export async function actualizarFuenteImagen(image: HTMLImageElement, source: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(source, window.location.href);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return false;

  const currentUrl = image.currentSrc || image.src;
  if (currentUrl === url.href && image.complete && image.naturalWidth > 0) {
    image.dataset.imageState = 'ready';
    return true;
  }

  const generation = (generations.get(image) || 0) + 1;
  generations.set(image, generation);
  image.dataset.imageState = 'loading';

  const candidate = new Image();
  candidate.decoding = 'async';
  candidate.src = url.href;
  try {
    await decodificar(candidate);
  } catch {
    if (generations.get(image) === generation) image.dataset.imageState = 'error';
    return false;
  }

  if (generations.get(image) !== generation) return false;
  if (candidate.naturalWidth === 0) {
    image.dataset.imageState = 'error';
    return false;
  }
  image.src = url.href;
  image.dataset.imageState = 'ready';
  return true;
}
