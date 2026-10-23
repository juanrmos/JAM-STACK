import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const siteUrl = site || new URL('https://portafolio-front.pages.dev');
  const sitemapUrl = new URL('/sitemap.xml', siteUrl);
  const content = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    '',
    `Sitemap: ${sitemapUrl.href}`,
    '',
  ].join('\n');

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
