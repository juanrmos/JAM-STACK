/**
 * Schemas de validación Zod para payloads de escritura.
 * Todo payload se valida antes de tocar D1 (doc 03, sección 4).
 * Skill deep-security, principio 6.
 */
import { z } from "zod";
import { categorias } from "../../Shared/contracts/categorias";
import { prepararVideoPermitido } from "../../Shared/contracts/video";

const videoUrlSchema = z.string().url("URL de video inválida")
  .refine((url) => prepararVideoPermitido(url) !== null, "Solo se aceptan enlaces reproducibles de YouTube o TikTok");

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
  descripcion: z.string().max(1000).optional().nullable(),
  categoria: z.enum(categorias),
  imagenKey: z.string().min(1, "La clave de imagen es obligatoria"),
  videoUrl: videoUrlSchema.optional(),
  orden: z.number().int("El orden debe ser un entero").min(0).max(5).optional().default(0),
  destacado: z.boolean().optional().default(false),
});

/** PUT /api/obras/:id */
export const actualizarObraSchema = z.object({
  titulo: z.string().min(1).max(200).optional(),
  descripcion: z.string().max(1000).optional().nullable(),
  categoria: z.enum(categorias).optional().nullable(),
  videoUrl: videoUrlSchema.optional().nullable(),
  imagenKey: z.string().min(1).optional(),
  orden: z.number().int().min(0).max(5).optional(),
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
