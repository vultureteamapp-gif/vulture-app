import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createJudgeService} from "./../../../../../../vendor/base/server/judge.mjs";
import {createDocumentService} from "./../../../../phrase-evidence-006/pwa-https-006/service.mjs";
import {liveController,readReviewerReplay,verifyPrepared,PIN} from "./../../../../phrase-evidence-006/pwa-https-006/runtime.mjs";
import {verifyState,trialState,statePath,assertMount,plainPath} from "./../../../../phrase-evidence-006/pwa-https-006/state.mjs";

const security={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",'Permissions-Policy':'camera=(), microphone=(), geolocation=(), usb=()','X-Vulture-Version':'0.14.3'};
export function validateEdge(headers,origin,localTest=false){if(headers.host!==new URL(origin).host||headers['sec-fetch-site']==='cross-site')throw Error('ORIGIN_DENIED');if(!localTest&&headers['x-forwarded-proto']!=='https')throw Error('HTTPS_EDGE_REQUIRED');}
export async function startHosted({stateRoot,runtimeRoot,publicDir,origin,port=0,host='127.0.0.1',accessSecret,enableLive=false,key='',transport,simulation=false,localTest=false,clock=Date.now}={}){
 const target=new URL(origin);
 if(target.origin!==origin||target.pathname!=='/'||target.username||target.password||target.search||target.hash)throw Error('EXACT_PUBLIC_ORIGIN_REQUIRED');
 if(!localTest&&(target.protocol!=='https:'||host!=='0.0.0.0'||port<1024||simulation||transport))throw Error('HOSTED_HTTPS_CONFIGURATION_REQUIRED');
 if(localTest&&(target.protocol!=='http:'||target.hostname!=='127.0.0.1'||host!=='127.0.0.1'))throw Error('LOOPBACK_TEST_ONLY');
 if(typeof accessSecret!=='string'||accessSecret.length<32||accessSecret.length>256)throw Error('STRONG_ACCESS_SECRET_REQUIRED');
 if(!enableLive&&key)throw Error('LIVE_KEY_WITHOUT_APPROVAL_DENIED');
 if(!enableLive&&transport)throw Error('REVIEWER_APPROVAL_REQUIRED');verifyState(stateRoot);await verifyPrepared(runtimeRoot);
 let live=null,docs=null,auth=null,server=null;
 let trial=trialState(stateRoot,{simulation,allowMissing:true});
 try{
  if(enableLive){if(!trial)throw Error('REVIEWER_APPROVAL_REQUIRED');live=await liveController({stateRoot,packageRoot:path.resolve(runtimeRoot,'../..'),origin,key,simulation,localTest,clock,...(transport?{fetchImpl:transport}:{})});}
  key='';
  docs=await createDocumentService({root:runtimeRoot,stateRoot:statePath(stateRoot,'service'),live,savedReviewer:actor=>readReviewerReplay({stateRoot,packageRoot:path.resolve(runtimeRoot,'../..'),origin,simulation,actor}),requestProfile:'phrase-006'});
  // Reuse existing signed, expiring HttpOnly/SameSite access sessions. Legacy AI routes are never routed here.
  auth=createJudgeService({stateDir:statePath(stateRoot,'auth'),accessSecret,config:{publicOrigin:localTest?null:origin},clock});
  const status=()=>{trial=trialState(stateRoot,{simulation,allowMissing:true});return {...docs.status(),version:'0.14.3',hosted:true,authenticated:true,keyPresent:live?.status().keyPresent??false,liveReady:!!live&&live.ready(),spent:true,originalTrialConsumed:true,liveCallsRemaining:live?.status().remaining??0,reviewerPeriod:live?.status()??null,approval:live?'separate-reviewer-period-100':'not-approved',requestSha256:PIN,serverBusinessSync:false};};
  const authCheck=async req=>{let raw='';await auth.handler({method:'GET',url:'/api/status',headers:{...req.headers},localPort:port},{setHeader(){},writeHead(){},end(v){raw=String(v??'');}});try{return JSON.parse(raw).authenticated===true;}catch{return false;}};
  const files={'/login':['login.html','text/html'],'/login.js':['login.js','text/javascript'],'/inbox':['index-mobile.html','text/html'],'/document.js':['document-mobile.js','text/javascript'],'/document.css':['style-mobile.css','text/css'],'/app-version.json':['app-version.json','application/json'],'/manifest.webmanifest':['manifest.webmanifest','application/manifest+json'],'/trial/inbox':['trial.html','text/html'],'/trial/document.js':['trial.js','text/javascript'],'/trial/document.css':['trial.css','text/css']};
  const assets=JSON.parse(fs.readFileSync(path.join(publicDir,'pwa-assets/assets-map.json'),'utf8'));
  const attempts=new Map();
  const healthy=()=>{verifyState(stateRoot);trialState(stateRoot,{simulation,allowMissing:true});};
  server=http.createServer(async(req,res)=>{
   for(const[k,v]of Object.entries(security))res.setHeader(k,v);
   if(!localTest)res.setHeader('Strict-Transport-Security','max-age=31536000');
   const send=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
   try{
    // Render's internal HTTP health probe need not traverse the public TLS edge. It returns no app/approval data.
    if(req.url==='/health'&&req.method==='GET'&&req.headers.host===target.host&&req.headers['sec-fetch-site']!=='cross-site'){healthy();return send(200,{ok:true,version:'0.14.3',externalCallsAutomatic:false});}
    try{validateEdge(req.headers,origin,localTest);}catch(e){return send(403,{error:e.message});}
    // Render terminates TLS. The dedicated service is reachable only through its edge; never infer origin from forwarded Host.
    const url=new URL(req.url,origin),post=req.method==='POST';
    if(!['GET','HEAD','POST'].includes(req.method))return send(405,{error:'METHOD_DENIED'});
    if(post&&(req.headers.origin!==origin||req.headers['content-type']!=='application/json'))return send(403,{error:'SAME_ORIGIN_JSON_REQUIRED'});
    if(url.pathname==='/api/session'&&post){
     const now=clock(),slot=Math.floor(now/60000);for(const[k,v]of attempts)if(v.slot!==slot)attempts.delete(k);
     const peer=req.socket.remoteAddress??'unknown',old=attempts.get(peer)??{slot,count:0};old.count++;attempts.set(peer,old);
     if(old.count>10)return send(429,{error:'LOGIN_RATE_LIMIT'});
     // Reused handler bounds the JSON body and compares the passphrase in constant time.
     req.localPort=port;return await auth.handler(req,res);
    }
    const publicAsset=['/login','/login.js','/manifest.webmanifest'].includes(url.pathname)||/^\/pwa-assets\/icon-[a-zA-Z0-9.-]+\.png$/.test(url.pathname);
    if(!publicAsset&&!(await authCheck(req))){if(['/', '/inbox','/trial/inbox'].includes(url.pathname)&&req.method==='GET'){res.writeHead(303,{Location:'/login'});return res.end();}return send(401,{error:'REVIEWER_LOGIN_REQUIRED'});}
    if(url.pathname==='/api/logout'&&post){res.setHeader('Set-Cookie','vulture_judge=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'+(localTest?'':'; Secure'));return send(200,{authenticated:false});}
    if(url.pathname==='/'&&req.method==='GET'){res.writeHead(303,{Location:'/inbox?channel=real'});return res.end();}
    if(['GET','HEAD'].includes(req.method)){
     let file=files[url.pathname];
     if(assets[url.pathname]){const a=assets[url.pathname];if(!/^[a-zA-Z0-9.-]+$/.test(a.file))throw Error('ASSET_PATH_INVALID');file=['pwa-assets/'+a.file,a.type];}
     if(file){const absolute=path.join(publicDir,file[0]);plainPath(absolute,'file');res.writeHead(200,{'Content-Type':file[1]+'; charset=utf-8'});return res.end(req.method==='HEAD'?undefined:fs.readFileSync(absolute));}
    }
    healthy();
    if(req.method==='GET'&&url.pathname==='/api/document/status')return send(200,status());
    if(req.method==='GET'&&url.pathname==='/api/document/trial')return send(200,docs.trial());
    if(req.method==='GET'&&url.pathname==='/api/document/last')return send(200,await docs.last(url.searchParams.get('actor'),url.searchParams.get('channel')??'offline'));
    if(!post||!['/api/document/prepare','/api/document/analyze','/api/mobile/hash'].includes(url.pathname))return send(404,{error:'ROUTE_NOT_AVAILABLE'});
    const chunks=[];let bytes=0;for await(const b of req){bytes+=b.length;if(bytes>65536)return send(413,{error:'INPUT_LIMIT'});chunks.push(b);}
    const body=JSON.parse(Buffer.concat(chunks));
    if(url.pathname==='/api/mobile/hash'){if(typeof body.text!=='string'||Object.keys(body).join(',')!=='text'||Buffer.byteLength(body.text)>32000)return send(400,{error:'HASH_INPUT_LIMIT'});return send(200,{sha256:createHash('sha256').update(body.text).digest('hex'),source:'local-node-crypto-no-ai'});}
    if(!Array.isArray(body.documents)||body.documents.length<1||body.documents.length>2||body.documents.some(x=>x.syntheticOnly!==true))return send(400,{error:'SYNTHETIC_INPUT_ONLY'});
    if(url.pathname.endsWith('/prepare'))return send(200,await docs.prepare(body));
    if(body.mode==='live'&&(!enableLive||!live||!live.ready()))return send(403,{error:live?.status().reason??'REVIEWER_APPROVAL_REQUIRED',mockFallback:false,automaticRetry:false});
    return send(200,await docs.run(body));
   }catch(e){const code=e.code??e.message;send(/DUPLICATE|BUSY/.test(code)?429:/STATE|INTEGRITY|PERSISTENT|SYMLINK/.test(code)?503:400,{status:'FAIL',error:/^[A-Z][A-Z0-9_]+$/.test(code)?code:'HOSTED_REQUEST_FAILED',mockFallback:false,automaticRetry:false});}
  });
  server.requestTimeout=60000;server.headersTimeout=10000;server.maxHeadersCount=40;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});
  return {server,docs,status,async close(){await new Promise(r=>server.close(r));docs.close();auth.close();}};
 }catch(e){if(server?.listening)await new Promise(r=>server.close(r));if(docs)docs.close();else live?.close();auth?.close();throw e;}
}
export async function main(){
 const root=import.meta.dirname,publicOrigin=process.env.VULTURE_PUBLIC_ORIGIN,stateRoot='/var/data/vulture/phrase-006',enableLive=process.env.VULTURE_ENABLE_LIVE==='reviewer-period-approved';
 assertMount();let key=process.env.NEBIUS_API_KEY??'',accessSecret=process.env.VULTURE_ACCESS_SECRET??'';
 delete process.env.NEBIUS_API_KEY;delete process.env.QLOO_API_KEY;delete process.env.VULTURE_ACCESS_SECRET;
 // No external transport is reachable except the existing exact-hash approved one-shot controller.
 const app=await startHosted({stateRoot,runtimeRoot:path.join(root,'runtime-root'),publicDir:path.join(root,'public'),origin:publicOrigin,port:Number(process.env.PORT??10000),host:'0.0.0.0',accessSecret,enableLive,key});key='';accessSecret='';
 console.log('Vulture 0.14.3 hosted ready; synthetic data; separate whole-period aggregate approval required.');
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>app.close().then(()=>process.exit(0)));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main();
