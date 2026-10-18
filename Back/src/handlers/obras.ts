import type { Env } from '../types';
import { crearObraSchema,actualizarObraSchema,uploadUrlSchema } from '../schemas';
import { generarUrlSubida } from '../lib/storage';
import { jsonResponse } from '../routes/response';
import { obraPublica } from '../routes/obras-lectura';
import { insertarSlot,cambiarSlot,cerrarHueco,comprobarOriginal,type ObraFila } from '../services/slots';
import { limpiarImagen } from '../storage/cleanup';
export { listarObras } from '../routes/obras-lectura';
const generarId=()=>crypto.randomUUID();
const sanitizarNombre=(s:string)=>s.toLowerCase().replace(/[^a-z0-9.-]/g,'-');
const invalid=()=>jsonResponse({error:{mensaje:'Datos inválidos. Revisa los campos.'}},400);
const missing=()=>jsonResponse({error:{mensaje:'Obra no encontrada.'}},404);
export async function obtenerObra(_r:Request,env:Env,id:string){const o=await env.DB.prepare('SELECT * FROM obras WHERE id=?').bind(id).first();return o?jsonResponse(obraPublica(env,o)):missing();}
/** POST /api/obras/upload-url */
export async function obtenerUrlSubida(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: { codigo: "PAYLOAD_INVALIDO", mensaje: "El cuerpo debe ser JSON vÃ¡lido." } }, 400);
  }

  const resultado = uploadUrlSchema.safeParse(body);
  if (!resultado.success) {
    return jsonResponse({ error: { codigo: "VALIDACION_FALLIDA", mensaje: "Datos invÃ¡lidos.", detalles: resultado.error.flatten().fieldErrors } }, 400);
  }

  const { nombreArchivo, tipoMime } = resultado.data;
  const id = generarId();
  const timestamp = Date.now();
  const extension = nombreArchivo.split(".").pop() ?? "jpg";
  const nombreSanitizado = sanitizarNombre(nombreArchivo.replace(/\.[^.]+$/, ""));

  const imagenKey = `obras/${id}/${timestamp}-${nombreSanitizado}.${extension}`;
  const uploadUrl = await generarUrlSubida(request, env, imagenKey, tipoMime);

  return jsonResponse({ uploadUrl, imagenKey, expiraEn: 300 });
}


export async function crearObra(r:Request,env:Env){
 const parsed=crearObraSchema.safeParse(await r.json().catch(()=>null));if(!parsed.success)return invalid();
 const o=parsed.data,id=generarId(),slot=o.destacado_slot??null;
 if(!await env.BUCKET.head(o.imagenKey))return invalid();
 const q=slot?insertarSlot(env,o.servicio_id,slot):[];
 q.push(env.DB.prepare('INSERT INTO obras(id,titulo,descripcion,servicio_id,imagen_key,video_url,ubicacion,anio,destacado_slot,fecha_creacion) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,o.titulo,o.descripcion??null,o.servicio_id,o.imagenKey,o.videoUrl??null,o.ubicacion??null,o.anio??null,slot,new Date().toISOString()));
 await env.DB.batch(q);return jsonResponse({id},201);
}
export async function actualizarObra(r:Request,env:Env,id:string){
 const old=await env.DB.prepare('SELECT * FROM obras WHERE id=?').bind(id).first<ObraFila>();if(!old)return missing();
 const parsed=actualizarObraSchema.safeParse(await r.json().catch(()=>null));if(!parsed.success)return invalid();
 const o=parsed.data,servicio=o.servicio_id??old.servicio_id;
 if(o.imagenKey&&!await env.BUCKET.head(o.imagenKey))return invalid();
 const slot=o.destacado_slot!==undefined?o.destacado_slot:servicio!==old.servicio_id?null:old.destacado_slot;
 const q=[comprobarOriginal(env,old),...cambiarSlot(env,old,servicio,slot)];
 const map:Record<string,string>={titulo:'titulo',descripcion:'descripcion',imagenKey:'imagen_key',videoUrl:'video_url',ubicacion:'ubicacion',anio:'anio'};
 const entries=Object.entries(o).filter(([k])=>map[k]);
 if(entries.length)q.push(env.DB.prepare('UPDATE obras SET '+entries.map(([k])=>map[k]+'=?').join(',')+' WHERE id=?').bind(...entries.map(([,v])=>v),id));
 try{await env.DB.batch(q);}catch{return jsonResponse({error:{mensaje:'La obra cambió. Recarga y vuelve a intentar.'}},409);}
 if(o.imagenKey&&o.imagenKey!==old.imagen_key)await limpiarImagen(env,old.imagen_key);
 return jsonResponse({actualizado:true});
}
export async function eliminarObra(_r:Request,env:Env,id:string){
 const old=await env.DB.prepare('SELECT * FROM obras WHERE id=?').bind(id).first<ObraFila>();if(!old)return missing();
 const q=[comprobarOriginal(env,old),env.DB.prepare('DELETE FROM obras WHERE id=?').bind(id)];
 if(old.destacado_slot!==null)q.push(...cerrarHueco(env,old.servicio_id,old.destacado_slot,id));
 try{await env.DB.batch(q);}catch{return jsonResponse({error:{mensaje:'La obra cambió. Recarga y vuelve a intentar.'}},409);}
 await limpiarImagen(env,old.imagen_key);return jsonResponse({eliminado:true});
}
