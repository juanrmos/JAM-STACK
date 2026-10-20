interface PagesEnv {
  ADMIN_API: {
    fetch(request: Request): Promise<Response>;
  };
}

interface PagesContext {
  request: Request;
  env: PagesEnv;
}

const PREFIX = "/admin/api";

export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const suffix = incomingUrl.pathname.slice(PREFIX.length);
  if (!/^\/(auth|obras|logos|contenido|textos|servicios|tipografia-portada|imagenes-sitio)(\/|$)/.test(suffix)) {
    return Response.json({ error: { codigo: "RUTA_NO_ENCONTRADA" } }, { status: 404 });
  }

  incomingUrl.pathname = `/api${suffix}`;
  const headers = new Headers(request.headers);
  headers.delete("Cookie");
  const init: RequestInit & { duplex: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
    duplex: "half",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  return env.ADMIN_API.fetch(new Request(incomingUrl, init));
}
