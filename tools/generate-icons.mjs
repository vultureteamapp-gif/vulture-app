// Directly authored geometric icon source for Vulture, 2026-10-28.
// No imported image, font, logo, texture, or third-party drawing library.
import fs from 'node:fs';import path from 'node:path';import {deflateSync} from 'node:zlib';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),dir=path.join(root,'assets/icons');fs.mkdirSync(dir,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}
const palette={background:[18,103,94,255],paper:[255,255,255,255],ink:[18,103,94,255]};
function distance(x,y,a,b,c,d){const vx=c-a,vy=d-b,t=Math.max(0,Math.min(1,((x-a)*vx+(y-b)*vy)/(vx*vx+vy*vy)));return Math.hypot(x-a-t*vx,y-b-t*vy);}
function pixel(x,y,maskable){let color=palette.background;const left=maskable?.28:.22,top=maskable?.22:.16,width=maskable?.44:.56,height=maskable?.56:.68;
 if(x>=left&&x<=left+width&&y>=top&&y<=top+height)color=palette.paper;
 const pad=maskable?.07:.08,lineLeft=left+pad,lineRight=left+width-pad;
 for(const yy of [top+.12,top+.21])if(x>=lineLeft&&x<=lineRight&&y>=yy&&y<=yy+.03)color=palette.ink;
 if(distance(x,y,.36,.59,.46,.69)<.025||distance(x,y,.46,.69,.66,.47)<.025)color=palette.ink;
 return color;
}
function png(size,maskable){const raw=Buffer.alloc((size*4+1)*size);for(let y=0;y<size;y++){const row=y*(size*4+1);raw[row]=0;for(let x=0;x<size;x++){const rgba=pixel((x+.5)/size,(y+.5)/size,maskable);for(let k=0;k<4;k++)raw[row+1+x*4+k]=rgba[k];}}const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
function svg(maskable){const l=maskable?28:22,t=maskable?22:16,w=maskable?44:56,h=maskable?56:68,p=maskable?7:8;return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#12675e"/><rect x="${l}" y="${t}" width="${w}" height="${h}" fill="#fff"/><path d="M ${l+p} ${t+13.5} H ${l+w-p} M ${l+p} ${t+22.5} H ${l+w-p}" stroke="#12675e" stroke-width="3"/><path d="M36 59 L46 69 L66 47" fill="none" stroke="#12675e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`;}
const icons=[];for(const [name,size,purpose,maskable]of [['icon-192',192,'any',false],['icon-512',512,'any',false],['icon-maskable-512',512,'maskable',true]]){const bytes=png(size,maskable),sha256=hash(bytes),file=name+'.'+sha256.slice(0,16)+'.png';fs.writeFileSync(path.join(dir,file),bytes);icons.push({file,sha256,bytes:bytes.length,size,purpose});}
fs.writeFileSync(path.join(root,'assets/icon-source.svg'),svg(false));fs.writeFileSync(path.join(root,'assets/icon-maskable-source.svg'),svg(true));
const manifestPath=path.join(root,'assets/manifest.webmanifest'),manifest=JSON.parse(fs.readFileSync(manifestPath));manifest.icons=icons.map(i=>({src:'/pwa-assets/'+i.file,sizes:i.size+'x'+i.size,type:'image/png',purpose:i.purpose}));fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(root,'assets/ICON-PROVENANCE.json'),JSON.stringify({createdClientDateKST:'2026-10-28',origin:'New deterministic receipt/check geometry authored for Vulture at user request; no old image pixels, external assets, fonts, or libraries',generator:'tools/generate-icons.mjs',thirdPartyImageInputs:[],oldUnknownIconsIncluded:false,licenseApplied:false,proposedLicense:'MIT, pending user ownership/copyright confirmation',icons},null,2)+'\n');console.log(JSON.stringify({newIcons:icons,thirdPartyImageInputs:0}));