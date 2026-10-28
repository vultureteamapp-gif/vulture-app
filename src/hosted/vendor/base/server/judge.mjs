import {randomUUID,timingSafeEqual,createHash,createHmac} from 'node:crypto';import fs from 'node:fs';import path from 'node:path';
import {AgentError,DEFAULT_MODEL,BASE_URL,validateSnapshot,deterministicReview,mockAnalysis,callNebius} from "./agent.mjs";
import {Journal,JournalError,digest} from "./journal.mjs";
export const defaults=Object.freeze({allowLive:false,budgetNanoUsd:0,maxRequests:0,inputEstimatedTokensLimit:8000,outputMaxTokens:2048,inputNanoUsdPerToken:300,outputNanoUsdPerToken:900,duplicateWindowMs:60000,timeoutMs:45000,publicOrigin:null});
export function validateConfig(raw={}){if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!(k in defaults)))throw Error('CONFIG_FIELDS_INVALID');const c={...defaults,...raw};for(const k of ['budgetNanoUsd','maxRequests','inputEstimatedTokensLimit','outputMaxTokens','inputNanoUsdPerToken','outputNanoUsdPerToken','duplicateWindowMs','timeoutMs'])if(!Number.isSafeInteger(c[k])||c[k]<0)throw Error('CONFIG_NUMBER_INVALID');if(typeof c.allowLive!=='boolean'||c.inputEstimatedTokensLimit<1||c.inputEstimatedTokensLimit>8000||c.outputMaxTokens!==2048||c.timeoutMs<1||c.timeoutMs>45000||c.budgetNanoUsd>1e12||c.maxRequests>1e6||c.inputNanoUsdPerToken>1e6||c.outputNanoUsdPerToken>1e6||c.duplicateWindowMs<1000)throw Error('CONFIG_LIMIT_INVALID');if(c.publicOrigin!==null){const u=new URL(c.publicOrigin);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('HTTPS_ORIGIN_REQUIRED');c.publicOrigin=u.origin;}return Object.freeze(c);}
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
const usageOnly=x=>{if(!x||!Number.isSafeInteger(x.prompt_tokens)||x.prompt_tokens<0||!Number.isSafeInteger(x.completion_tokens)||x.completion_tokens<0)return null;return {prompt_tokens:x.prompt_tokens,completion_tokens:x.completion_tokens};};
export function createJudgeService({stateDir,config={},key='',enabled=false,testTransport,accessSecret='',webDir,replayFile,savedReplay,beforeExternal,clock=Date.now}={}){
 const c=validateConfig(config),offline=typeof testTransport==='function';
 if(key&&(/[\s"'\r\n]/.test(key)||/^Bearer\b/i.test(key)))throw Error('KEY_FORMAT_INVALID');
 if(c.publicOrigin&&accessSecret.length<24)throw Error('REVIEWER_ACCESS_SECRET_REQUIRED');
 const live=!offline&&enabled===true&&c.allowLive===true&&!!key;
 if((live||offline)&&(c.budgetNanoUsd<=0||c.maxRequests<1||c.inputNanoUsdPerToken<1||c.outputNanoUsdPerToken<1))throw Error('POSITIVE_LIMITS_REQUIRED');
 const journal=new Journal(stateDir,c);let busy=false,transportInvocations=0;
 const mode=offline?'offline-double':live?'live':'blocked';
 const scrub=s=>{let x=String(s);for(const secret of [key,accessSecret])if(secret)x=x.split(secret).join('[REDACTED]');return x.replace(/Bearer\s+\S+/gi,'Bearer [REDACTED]');};
 const sessionValid=cookie=>{if(!accessSecret)return true;try{const token=String(cookie??'').split(';').map(s=>s.trim()).find(s=>s.startsWith('vulture_judge='))?.slice(14);if(!token)return false;const [payload,sig]=token.split('.');const expected=createHmac('sha256',accessSecret).update(payload).digest('hex');if(sig?.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;const v=JSON.parse(Buffer.from(payload,'base64url'));return v.exp>clock()&&v.exp<=clock()+8*3600000;}catch{return false;}};
 const createSession=pass=>{const a=createHash('sha256').update(String(pass)).digest(),b=createHash('sha256').update(accessSecret).digest();if(!accessSecret||!timingSafeEqual(a,b))throw new AgentError('REVIEWER_AUTH_FAILED',401);const payload=Buffer.from(JSON.stringify({exp:clock()+8*3600000,nonce:randomUUID()})).toString('base64url');return payload+'.'+createHmac('sha256',accessSecret).update(payload).digest('hex');};
 const info=()=>({app:'Vulture Judge 003',mode,data:'synthetic-only',realInferenceEnabled:live,providerBillingHardCap:false,authRequired:!!accessSecret,offlineCallsRemaining:offline?Math.max(0,c.maxRequests-journal.summary().attempts):0,nebius:{keyPresent:!!key,spendingApproved:live,ready:(live||offline)&&!busy&&journal.summary().attempts<c.maxRequests&&journal.summary().remainingEstimatedNanoUsd>=c.inputEstimatedTokensLimit*c.inputNanoUsdPerToken+c.outputMaxTokens*c.outputNanoUsdPerToken,model:DEFAULT_MODEL,liveCallsRemaining:live?Math.max(0,c.maxRequests-journal.summary().attempts):0},mockFallback:false,transportInvocations,limits:{inputEstimatedTokens:c.inputEstimatedTokensLimit,outputMaxTokens:c.outputMaxTokens},accounting:journal.summary()});
 async function analyze(body){if(!body||Object.keys(body).some(k=>!['mode','snapshot','requestId'].includes(k))||!['live','mock'].includes(body.mode))throw new AgentError('INVALID_ANALYSIS_MODE');
  const data=validateSnapshot(body.snapshot),tool=deterministicReview(data),inputHash=digest(stable(data));
  if(body.mode==='mock')return {source:'explicit-mock',mock:true,realInference:false,requestId:randomUUID(),model:'none',provider:'none',analysis:mockAnalysis(tool),deterministic:tool,inputHash,durationMs:0};
  if(!live&&!offline)throw new AgentError('EXTERNAL_CALLS_DISABLED',403);
  if(busy)throw new AgentError('ANALYSIS_BUSY',429);
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.requestId??''))throw new AgentError('REQUEST_ID_REQUIRED');
  busy=true;let reserved=false,usage=null,httpStatus=null,responseHash=null,requestHash=null,estimatedInputTokens=null,transportError=null;
  const signal=AbortSignal.timeout(c.timeoutMs);
  const audit=e=>{httpStatus=e.httpStatus;if(typeof e.rawResponse==='string'){responseHash=digest(e.rawResponse);try{const raw=JSON.parse(e.rawResponse);usage=usageOnly(raw.usage);if(e.httpStatus>=200&&e.httpStatus<300&&raw.model!==DEFAULT_MODEL)throw new AgentError('PROVIDER_MODEL_MISMATCH',502);}catch(e){if(e instanceof AgentError)throw e;}}};
  try{
   const guardedRaw=async(url,options)=>{
    if(url!==BASE_URL||options.method!=='POST'||options.redirect!=='error')throw new AgentError('PROVIDER_ROUTE_DENIED',403);
    const wire=JSON.parse(options.body);if(wire.model!==DEFAULT_MODEL||wire.max_tokens!==2048)throw new AgentError('PROVIDER_CONTRACT_INVALID');
    // UTF-8 bytes plus template allowance is conservative, NOT a model tokenizer or billing hard cap.
    estimatedInputTokens=Buffer.byteLength(JSON.stringify(wire.messages),'utf8')+512;if(estimatedInputTokens>c.inputEstimatedTokensLimit)throw new AgentError('INPUT_ESTIMATE_LIMIT',413);
    if(beforeExternal)beforeExternal();requestHash=digest(stable(wire));const reserve=c.inputEstimatedTokensLimit*c.inputNanoUsdPerToken+c.outputMaxTokens*c.outputNanoUsdPerToken;
    journal.reserve({id:body.requestId,requestHash,inputHash,reservedNanoUsd:reserve,estimatedInputTokens,executionMode:mode,at:clock()});reserved=true;
    transportInvocations++;
    const transport=offline?testTransport:globalThis.fetch;
    return await new Promise((resolve,reject)=>{const abort=()=>reject(new DOMException('timeout','TimeoutError'));if(signal.aborted)return abort();signal.addEventListener('abort',abort,{once:true});Promise.resolve().then(()=>transport(url,options)).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));});
   };
   const guarded=(...args)=>guardedRaw(...args).catch(e=>{if(e instanceof AgentError||e instanceof JournalError)transportError=e;throw e;});
   const deadline=new Promise((_,reject)=>{const abort=()=>reject(new DOMException('timeout','TimeoutError'));if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});});
   const result=await Promise.race([callNebius(data,tool,{key:offline?'offline-double-not-a-provider-credential':key,approved:true,fetchImpl:guarded,signal,audit,requestId:body.requestId}),deadline]);
   if(result.model!==DEFAULT_MODEL)throw new AgentError('PROVIDER_MODEL_MISMATCH',502);
   usage=usageOnly(result.usage);if(usage&&(usage.completion_tokens>c.outputMaxTokens||usage.prompt_tokens>c.inputEstimatedTokensLimit))throw new AgentError('PROVIDER_USAGE_LIMIT_VIOLATION',502);journal.finish(body.requestId,{state:'success',usage,httpStatus,responseHash});
   return JSON.parse(scrub(JSON.stringify({...result,source:offline?'offline-provider-double':'nebius-live',realInference:!offline,mock:false,inputHash,requestHash,estimatedInputTokens,usageState:usage?'known':'unknown',usage,providerBillingHardCap:false,accounting:journal.summary()})));
  }catch(e){e=transportError??e;const safe=e instanceof AgentError||e instanceof JournalError?e:new AgentError(e?.name==='TimeoutError'||e?.name==='AbortError'?'NEBIUS_TIMEOUT':'PROVIDER_OR_JOURNAL_ERROR',502);if(reserved)journal.finish(body.requestId,{state:'error',error:safe.code,usage,httpStatus,responseHash});throw safe;
  }finally{busy=false;}
 }
 async function handler(req,res){const origin=c.publicOrigin??'http://127.0.0.1:'+req.localPort;const headers={'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src data: blob:; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=(), usb=(), bluetooth=()'};for(const [k,v]of Object.entries(headers))res.setHeader(k,v);
  const json=(status,v)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(scrub(JSON.stringify(v)));};
  let responseRequestId=randomUUID();
  try{
   if(req.headers.host!==new URL(origin).host||req.headers['sec-fetch-site']==='cross-site')throw new AgentError('ORIGIN_DENIED',403);
   const url=new URL(req.url,origin),pathname=decodeURIComponent(url.pathname);const post=req.method==='POST';
   if(post&&(req.headers.origin!==origin||req.headers['content-type']!=='application/json'))throw new AgentError('SAME_ORIGIN_JSON_REQUIRED',403);
   let body;if(post){const chunks=[];let size=0;for await(const b of req){size+=b.length;if(size>131072)throw new AgentError('REQUEST_TOO_LARGE',413);chunks.push(b);}try{body=JSON.parse(Buffer.concat(chunks));if(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body?.requestId??''))responseRequestId=body.requestId;}catch{throw new AgentError('INVALID_JSON');}}
   if(pathname==='/health'&&req.method==='GET'){json(200,{ok:true,mode,realInferenceEnabled:live});return;}
   if(pathname==='/api/session'&&post){const cookie=createSession(body?.passphrase);res.setHeader('Set-Cookie','vulture_judge='+cookie+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800'+(c.publicOrigin?'; Secure':''));json(200,{authenticated:true});return;}
   if(pathname==='/api/status'&&req.method==='GET'){if(!sessionValid(req.headers.cookie)){json(200,{authRequired:true,authenticated:false,mode,nebius:{ready:false,keyPresent:false,liveCallsRemaining:0}});return;}json(200,{...info(),authenticated:true});return;}
   if(pathname.startsWith('/api/')&&!sessionValid(req.headers.cookie))throw new AgentError('REVIEWER_LOGIN_REQUIRED',401);
   if(pathname==='/api/saved-judge-ko-001'&&req.method==='GET'&&typeof savedReplay==='function'){json(200,savedReplay());return;}
   if(pathname==='/api/judge/analyze'&&post){json(200,await analyze(body));return;}
   if(pathname==='/api/trial-result'&&req.method==='GET'){const replay=JSON.parse(fs.readFileSync(replayFile));if(replay.requestId!=='1a9fe214-3c8a-4443-b83a-b589398f5572'||replay.result?.mock!==false)throw new AgentError('SAVED_REPLAY_INVALID',503);json(200,replay);return;}
   if(pathname.startsWith('/api/'))throw new AgentError('API_NOT_IMPLEMENTED',404);
   if(!['GET','HEAD'].includes(req.method)||/[\x00-\x1f\\:]/.test(pathname)||pathname.split('/').includes('..'))throw new AgentError('PATH_DENIED',403);
   const ext=path.extname(pathname),file=ext?path.resolve(webDir,'.'+pathname):path.join(webDir,'index.html');const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
   if(!file.startsWith(path.resolve(webDir)+path.sep)||!types[path.extname(file)]||!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink())throw new AgentError('ASSET_NOT_FOUND',404);res.writeHead(200,{'Content-Type':types[path.extname(file)]});res.end(req.method==='HEAD'?undefined:fs.readFileSync(file));
  }catch(e){json(e.status??500,{requestId:responseRequestId,source:'error',mock:false,realInference:false,error:e instanceof AgentError||e instanceof JournalError?e.code:'INTERNAL_ERROR',message:'실패를 Mock 성공이나 저장 응답으로 대체하지 않습니다.'});}
 }
 return {handler,analyze,status:info,close:()=>journal.close(),journal};
}
