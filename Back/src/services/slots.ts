import type { Env } from '../types';
export type ObraFila = {id:string; servicio_id:string; destacado_slot:number|null; imagen_key:string; [key:string]:unknown};
// Each caller executes the complete sequence in one D1 batch (transaction).
export function insertarSlot(env:Env, servicio:string, slot:number):D1PreparedStatement[] {
 const q=[env.DB.prepare('UPDATE obras SET destacado_slot=NULL WHERE servicio_id=? AND destacado_slot=5').bind(servicio)];
 for(let n=4;n>=slot;n--) q.push(env.DB.prepare('UPDATE obras SET destacado_slot=? WHERE servicio_id=? AND destacado_slot=?').bind(n+1,servicio,n));
 return q;
}
export function cerrarHueco(env:Env, servicio:string, slot:number, excluir:string):D1PreparedStatement[] {
 const q:D1PreparedStatement[]=[];
 for(let n=slot;n<5;n++) q.push(env.DB.prepare(`UPDATE obras SET destacado_slot=? WHERE id=(SELECT id FROM obras WHERE servicio_id=? AND destacado_slot>? ORDER BY destacado_slot LIMIT 1) AND NOT EXISTS(SELECT 1 FROM obras WHERE servicio_id=? AND destacado_slot=?)`).bind(n,servicio,n,servicio,n));
 q.push(env.DB.prepare(`UPDATE obras SET destacado_slot=(SELECT MIN(n) FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) WHERE n>=? AND NOT EXISTS(SELECT 1 FROM obras WHERE servicio_id=? AND destacado_slot=n)) WHERE id=(SELECT id FROM obras WHERE servicio_id=? AND destacado_slot IS NULL AND id!=? ORDER BY fecha_creacion DESC,id LIMIT 1)`).bind(slot,servicio,servicio,excluir));
 return q;
}
export function comprobarOriginal(env:Env, obra:ObraFila):D1PreparedStatement {
 // Abort the whole batch if another writer moved/deleted this work after the read.
 // A NULL service is rejected by the schema; a matching snapshot inserts nothing.
 return env.DB.prepare(`INSERT INTO servicios(id) SELECT NULL WHERE NOT EXISTS(SELECT 1 FROM obras WHERE id=? AND servicio_id=? AND destacado_slot IS ? AND imagen_key=?)`).bind(obra.id,obra.servicio_id,obra.destacado_slot,obra.imagen_key);
}
export function cambiarSlot(env:Env, old:ObraFila, servicio:string, slot:number|null):D1PreparedStatement[] {
 if(old.servicio_id===servicio && old.destacado_slot===slot) return [];
 const q=[env.DB.prepare('UPDATE obras SET destacado_slot=NULL WHERE id=?').bind(old.id)];
 if(old.servicio_id===servicio && old.destacado_slot!==null && slot!==null){
  const step=old.destacado_slot<slot?1:-1;
  for(let n=old.destacado_slot+step;step>0?n<=slot:n>=slot;n+=step) q.push(env.DB.prepare('UPDATE obras SET destacado_slot=? WHERE servicio_id=? AND destacado_slot=?').bind(n-step,servicio,n));
 }else{
  if(old.destacado_slot!==null) q.push(...cerrarHueco(env,old.servicio_id,old.destacado_slot,old.id));
  if(slot!==null) q.push(...insertarSlot(env,servicio,slot));
 }
 q.push(env.DB.prepare('UPDATE obras SET servicio_id=?,destacado_slot=? WHERE id=?').bind(servicio,slot,old.id));
 return q;
}
