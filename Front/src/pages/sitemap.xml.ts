import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const siteUrl = site || new URL('https://portafolio-front.pages.dev');
  const homepage = new URL('/', siteUrl).href;
  const content = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${homepage}</loc></url>`,
    '</urlset>',
    '',
  ].join('\n');

  return new Response(content, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
