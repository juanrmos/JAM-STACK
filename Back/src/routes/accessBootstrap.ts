/** Construye el retorno fijo al login tras completar la sesión de Cloudflare Access. */
export function crearRespuestaAccessInicio(
  request: Request,
  frontendOrigin: string,
  localMedia = false,
): Response {
  const url = new URL(request.url);
  const configuredOrigin = new URL(frontendOrigin).origin;
  const requestedReturn = url.searchParams.get("return_to");
  let returnOrigin = configuredOrigin;

  if (requestedReturn) {
    try {
      const candidate = new URL(requestedReturn);
      const isLocalWorker = localMedia &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      const isLocalReturn = isLocalWorker && candidate.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(candidate.hostname);
      const isProjectPreview = candidate.protocol === "https:" &&
        candidate.hostname.endsWith(".portafolio-front.pages.dev");
      if (candidate.origin === configuredOrigin || isLocalReturn || isProjectPreview) {
        returnOrigin = candidate.origin;
      }
    } catch {
      // Un retorno inválido cae al origen fijo de Front configurado en el Worker.
    }
  }

  const returnUrl = new URL("/admin/login/", returnOrigin);
  returnUrl.searchParams.set("access", "ready");
  return new Response(null, {
    status: 302,
    headers: {
      Location: returnUrl.toString(),
      "Cache-Control": "no-store",
    },
  });
}
