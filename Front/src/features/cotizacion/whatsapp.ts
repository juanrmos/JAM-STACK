import { siteConfig } from '../../config/site';
export function enlaceWhatsapp(mensaje: string) {
  return `https://wa.me/${siteConfig.contacto.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
export interface Cotizacion { obra: string; medidas: string; ubicacion: string; altura: string; direccion: string; referencia: string }
export function mensajeCotizacion(datos: Cotizacion) {
  return `Hola, quiero cotizar un mural de ${datos.obra} de ${datos.medidas}, ${datos.ubicacion}, ${datos.altura}. Te comparto mi direccion: ${datos.direccion}, ${datos.referencia}.`;
}
