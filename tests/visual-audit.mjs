import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const root = resolve('Front/dist');
const mime = {'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.json':'application/json'};
const server = createServer((req,res)=>{
  let file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root)){res.writeHead(403).end();return;}
  if(existsSync(file)&&statSync(file).isDirectory())file=resolve(file,'index.html');
  if(!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));
});
await new Promise(done=>server.listen(4332,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,channel:'msedge'});
const results=[];
try {
  for(const width of [320,360,390,430,768,1024,1440]) {
    const context=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1,serviceWorkers:'block'});
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.hostname==='127.0.0.1'&&url.port==='4332')return route.continue();
      if(url.pathname==='/api/logos')return route.fulfill({json:{logos:[]}});
      if(url.pathname==='/api/obras'){
        const cat=url.searchParams.get('categoria');
        const count=cat==='mural'?5:cat==='cuadro'?3:0;
        const obras=Array.from({length:count},(_,i)=>({id:`${cat}-${i}`,titulo:`Obra ${i+1}`,categoria:cat,imagenUrl:'http://127.0.0.1:4332/images/obra-1.jpg',videoUrl:null}));
        return route.fulfill({json:{obras,total:count,hasMore:false}});
      }
      return route.abort();
    });
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:4332/');
    await page.waitForFunction(()=>document.querySelector('#galeria-estado')?.textContent==='');
    const state=await page.evaluate(()=>{
      const rect=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x),right:Math.round(r.right),w:Math.round(r.width),h:Math.round(r.height),font:getComputedStyle(e).fontSize,visible:r.width>0&&r.height>0};};
      const body=document.body,html=document.documentElement;
      const offscreen=[...document.querySelectorAll('a,button,input,select,h1,h2,h3,p')].filter(e=>{
        const r=e.getBoundingClientRect();return r.width>0 && (r.right>innerWidth+1 || r.left < -1) && getComputedStyle(e).position!=='fixed';
      }).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent?.trim().slice(0,35),left:Math.round(e.getBoundingClientRect().left),right:Math.round(e.getBoundingClientRect().right)}));
      const targets=[...document.querySelectorAll('a,button')].filter(e=>e.getBoundingClientRect().width>0&&getComputedStyle(e).visibility!=='hidden').map(e=>({name:e.getAttribute('aria-label')||e.textContent.trim().slice(0,24),w:Math.round(e.getBoundingClientRect().width),h:Math.round(e.getBoundingClientRect().height)}));
      return {viewport:innerWidth,scrollWidth:Math.max(body.scrollWidth,html.scrollWidth),header:rect('.nav'),logo:rect('.nav__logo'),links:rect('.nav__links'),h1:rect('.hero__titulo'),heroImage:rect('.hero__imagen'),services:rect('.servicios__grid'),gallery:rect('.galeria'),rail:rect('#riel-mural'),footer:rect('.footer__inner'),offscreen,smallTargets:targets.filter(t=>t.w<24||t.h<24)};
    });
    await page.locator('#hero-cotizar-btn').click();
    await page.waitForTimeout(550);
    state.drawer=await page.evaluate(()=>{const r=document.querySelector('#cotizador-drawer').getBoundingClientRect();return{x:Math.round(r.x),right:Math.round(r.right),w:Math.round(r.width),scrollHeight:document.querySelector('#cotizador-drawer').scrollHeight,clientHeight:document.querySelector('#cotizador-drawer').clientHeight};});
    if([320,390,768,1440].includes(width)){
      await page.locator('#cotizador-cerrar').click();await page.waitForTimeout(550);
      mkdirSync('.work/responsive',{recursive:true});
      await page.screenshot({path:`.work/responsive/${width}.png`,fullPage:true});
    }
    results.push(state);await context.close();
  }
  writeFileSync('.work/responsive/metrics.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
} finally {await browser.close();await new Promise(done=>server.close(done));}
