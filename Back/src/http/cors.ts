import type { Env } from "../types";

export function corsHeaders(request: Request, env: Env): Record<string, string> {
  if (env.API_PUBLIC_ONLY === 'true') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }

  const origin = request.headers.get('Origin');
  const requestHost = new URL(request.url).hostname;
  const local = env.LOCAL_MEDIA === 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(requestHost);
  let permitido = false;
  if (origin) {
    try {
      const url = new URL(origin);
      const isPagesPreview = env.ALLOW_PAGES_PREVIEW_ORIGINS === "true" &&
        url.protocol === "https:" && url.hostname.endsWith(".portafolio-front.pages.dev");
      permitido = local
        ? url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
        : url.protocol === 'https:' && (origin === env.FRONTEND_ORIGIN || isPagesPreview);
    } catch {
      permitido = false;
    }
  }

  return {
    'Vary': 'Origin',
    ...(permitido ? {
      'Access-Control-Allow-Origin': origin!,
      'Access-Control-Allow-Credentials': 'true',
    } : {}),
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}
