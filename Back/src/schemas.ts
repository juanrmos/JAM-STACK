/**
 * Schemas de validación Zod para payloads de escritura.
 * Todo payload se valida antes de tocar D1 (doc 03, sección 4).
 * Skill deep-security, principio 6.
 */
import { z } from "zod";

/** POST /api/auth/login */
export const loginSchema = z.object({
  secreto: z.string().min(1, "El secreto es obligatorio"),
});

/** POST /api/obras/upload-url */
export const uploadUrlSchema = z.object({
  nombreArchivo: z.string().min(1, "El nombre del archivo es obligatorio"),
  tipoMime: z
    .string()
    .regex(/^image\/(jpeg|png|webp)$/, "Solo se aceptan imágenes JPEG, PNG o WEBP"),
});

/** POST /api/obras */
export const crearObraSchema = z.object({
  titulo: z.string().min(1, "El título es obligatorio").max(200),
  descripcion: z.string().max(1000).optional(),
  categoria: z.string().max(50).optional(),
  imagenKey: z.string().min(1, "La clave de imagen es obligatoria"),
  videoUrl: z
    .string()
    .url("URL de video inválida")
    .refine(
      (url) => url.includes("youtube.com") || url.includes("youtu.be") || url.includes("tiktok.com"),
      "Solo se aceptan URLs de YouTube o TikTok"
    )
    .optional(),
  orden: z.number().int("El orden debe ser un entero").min(0),
  destacado: z.boolean().optional().default(false),
});

/** PUT /api/obras/:id */
export const actualizarObraSchema = z.object({
  titulo: z.string().min(1).max(200).optional(),
  descripcion: z.string().max(1000).optional().nullable(),
  categoria: z.string().max(50).optional().nullable(),
  videoUrl: z
    .string()
    .url()
    .refine(
      (url) => url.includes("youtube.com") || url.includes("youtu.be") || url.includes("tiktok.com"),
      "Solo se aceptan URLs de YouTube o TikTok"
    )
    .optional()
    .nullable(),
  orden: z.number().int().min(0).optional(),
  destacado: z.boolean().optional(),
});

/** POST /api/logos */
export const crearLogoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(200),
  imagenKey: z.string().min(1, "La clave de imagen es obligatoria"),
  activo: z.boolean().optional().default(false),
});

/** PUT /api/logos/:id */
export const actualizarLogoSchema = z.object({
  nombre: z.string().min(1).max(200).optional(),
  imagenKey: z.string().min(1).optional(),
  activo: z.boolean().optional(),
});
