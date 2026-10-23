import type { Env } from '../types';
import catalogo from '../../../Shared/contracts/textos.json';
import { jsonResponse } from '../routes/response';
import { generarUrlPublica,generarUrlSubida } from '../lib/storage';
import { uploadUrlSchema } from '../schemas';
import { limpiarImagen } from '../storage/cleanup';
import { clavesImagenesSitio, type ImagenSitioClave } from '../../../Shared/contracts/imagenes-sitio';
const spec:Record<string,{valor:string;grupo:string;max:number}>=catalogo;
const invalid=(mensaje:string)=>jsonResponse({error:{mensaje}},400);
export async function leerContenido(_r:Request,env:Env){
 const {results}=await env.DB.prepare('SELECT clave,valor FROM textos').all<{clave:string;valor:string}>();
 const textos=Object.fromEntries(results.filter(x=>Object.hasOwn(spec,x.clave)).map(x=>[x.clave,x.valor]));
 const {results:photos}=await env.DB.prepare('SELECT clave,imagen_key FROM imagenes_sitio').all<{clave:ImagenSitioClave;imagen_key:string}>();
 const imagenes:Record<string,string|null>=Object.fromEntries(clavesImagenesSitio.map(clave=>[clave,null]));
 for(const photo of photos)imagenes[photo.clave]=generarUrlPublica(env,photo.imagen_key);
 return jsonResponse({textos,imagenes});
}
export async function guardarTextos(r:Request,env:Env){
 const body=await r.json().catch(()=>null) as {textos?:Record<string,unknown>}|null;
 if(!body||Object.keys(body).length!==1||!body.textos||typeof body.textos!=='object'||Array.isArray(body.textos))return invalid('Envía un objeto textos.');
 const entries=Object.entries(body.textos);if(!entries.length)return invalid('No se enviaron cambios.');
 for(const [k,v]of entries)if(!Object.hasOwn(spec,k)||typeof v!=='string'||!v.trim()||v.length>spec[k].max)return invalid('Clave no editable o texto vacío/demasiado largo.');
 const {results}=await env.DB.prepare('SELECT clave,valor FROM textos').all<{clave:string;valor:string}>();
 const values=Object.fromEntries(results.map(x=>[x.clave,x.valor]));Object.assign(values,body.textos);
 for(const key of ['home','archive','profile','about'])if(!values[key+'.title']?.includes(values[key+'.titleAccent']))return invalid('La palabra destacada debe existir en su título. Guarda ambos campos juntos.');
 await env.DB.batch(entries.map(([k,v])=>env.DB.prepare('UPDATE textos SET valor=?,fecha_actualizacion=? WHERE clave=?').bind(String(v).trim(),new Date().toISOString(),k)));
 return jsonResponse({actualizado:true});
}
export async function subirFoto(r:Request,env:Env){
 const parsed=uploadUrlSchema.safeParse(await r.json().catch(()=>null));if(!parsed.success)return invalid('Imagen inválida.');
 const {tipoMime}=parsed.data,imagenKey=`sitio/${crypto.randomUUID()}.${tipoMime==='image/jpeg'?'jpg':tipoMime.split('/')[1]}`;
 return jsonResponse({imagenKey,uploadUrl:await generarUrlSubida(r,env,imagenKey,tipoMime),expiraEn:300});
}
export async function guardarFoto(r:Request,env:Env,clave:ImagenSitioClave){
 const body=await r.json().catch(()=>null) as {imagenKey?:unknown}|null;
 if(!body||Object.keys(body).length!==1||typeof body.imagenKey!=='string'||!/^sitio\/[a-f0-9-]+\.(jpg|png|webp)$/.test(body.imagenKey))return invalid('Imagen inválida.');
 if(!await env.BUCKET.head(body.imagenKey))return invalid('Sube la imagen antes de guardar.');
 const old=await env.DB.prepare('SELECT imagen_key FROM imagenes_sitio WHERE clave=?').bind(clave).first<{imagen_key:string}>();
 await env.DB.prepare('INSERT INTO imagenes_sitio(clave,imagen_key,fecha_actualizacion) VALUES(?,?,?) ON CONFLICT(clave) DO UPDATE SET imagen_key=excluded.imagen_key,fecha_actualizacion=excluded.fecha_actualizacion').bind(clave,body.imagenKey,new Date().toISOString()).run();
 if(old&&old.imagen_key!==body.imagenKey)await limpiarImagen(env,old.imagen_key);
 return jsonResponse({actualizado:true,imagenUrl:generarUrlPublica(env,body.imagenKey)});
}
