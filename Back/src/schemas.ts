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

const obraCampos = z.object({
  titulo: z.string().trim().min(1).max(200),
  descripcion: z.string().max(1500).nullable().optional(),
  servicio_id: z.enum(categorias),
  imagenKey: z.string().regex(/^(obras|fixtures)\/[a-zA-Z0-9/_.-]+$/),
  videoUrl: videoUrlSchema.nullable().optional(),
  ubicacion: z.string().trim().max(200).nullable().optional(),
  anio: z.number().int().min(1000).max(9999).nullable().optional(),
  // Campo histórico: se acepta el cero (y null de clientes antiguos), pero
  // las escrituras siempre normalizan su valor a 0.
  destacado_slot: z.union([z.literal(0), z.null()]).optional(),
});
export const crearObraSchema = obraCampos.strict();
export const actualizarObraSchema = obraCampos.partial().strict();

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
