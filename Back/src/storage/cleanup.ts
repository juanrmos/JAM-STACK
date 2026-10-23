import type { Env } from '../types';
export async function limpiarImagen(env:Env,key:string){
 const usado=await env.DB.prepare('SELECT imagen_key FROM obras WHERE imagen_key=? UNION ALL SELECT imagen_key FROM logos WHERE imagen_key=? UNION ALL SELECT imagen_key FROM imagenes_sitio WHERE imagen_key=? UNION ALL SELECT imagen_key FROM fotos_sobre_nosotros WHERE imagen_key=? LIMIT 1').bind(key,key,key,key).first();
 if(usado)return;
 try{await env.BUCKET.delete(key);}catch{console.error('Limpieza R2 pendiente para objeto sin referencias',key);}
}
