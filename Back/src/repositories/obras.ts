import type { Env } from '../types';
export async function consultarObras(env:Env, servicio:string|null,buscar:string|null,slots:boolean,limit:number,offset:number){
 const where:string[]=[]; const params:unknown[]=[];
 if(servicio){where.push('servicio_id=?');params.push(servicio);}
 if(buscar){where.push('titulo LIKE ? COLLATE NOCASE');params.push(`%${buscar}%`);}
 if(slots)where.push('destacado_slot IS NOT NULL');
 const filtro=where.length?' WHERE '+where.join(' AND '):'';
 const result=await env.DB.batch<{total:number}|Record<string,unknown>>([
 env.DB.prepare('SELECT COUNT(*) total FROM obras'+filtro).bind(...params),
 env.DB.prepare('SELECT * FROM obras'+filtro+' ORDER BY destacado_slot IS NULL, destacado_slot, fecha_creacion DESC,id LIMIT ? OFFSET ?').bind(...params,limit,offset)]);
 return {results:result[1].results,total:Number(result[0].results[0]?.total||0)};
}
