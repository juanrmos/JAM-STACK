import type { APIRoute } from 'astro';
import { paginaSeoComplementarios, paginasSeoServicios } from '../config/seo-servicios';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const siteUrl = site || new URL('https://corporacionantonyrodriguez.com');
  const urls = [
    new URL('/', siteUrl).href,
    ...paginasSeoServicios.map((page) => new URL(`/servicios/${page.slug}/`, siteUrl).href),
    new URL(`/servicios/${paginaSeoComplementarios.slug}/`, siteUrl).href,
  ];
  const content = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${url}</loc></url>`),
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
