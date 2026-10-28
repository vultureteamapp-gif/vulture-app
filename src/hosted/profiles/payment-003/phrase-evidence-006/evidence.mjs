import {documentSignature,sha,normalize} from "./../../../core.mjs";
export const VERSION='phrase-candidates/0.6';
const labels={date:['Date','날짜'],vehicle:['Vehicle','차량'],origin:['From','출발지','상차지'],destination:['To','도착지','하차지'],departure:['Departure','출발시각'],amount:['Fare','Amount','Total','운임','금액','총액'],currency:['Currency','통화'],liters:['Liters','리터'],unitPrice:['Unit price','단가'],station:['Station','주유소'],reference:['Reference','승인번호'],status:['Status','상태'],action:['Action','작업'],merchant:['Merchant','가맹점'],paymentState:['Payment status','결제 상태']};
export function labelOf(text){const m=text.match(/^([^:：]+)[:：]\s*(.*)$/u);if(!m)return null;const field=Object.keys(labels).find(f=>labels[f].some(x=>x.toLowerCase()===m[1].trim().toLowerCase()));return field?{field,value:m[2].trim(),valueOffset:text.length-m[2].length+m[2].length-m[2].trimStart().length}:null;}
export function evidenceFor(doc,id){
 if(!['load','fuel','payment'].includes(doc?.kind)||doc.syntheticOnly!==true||typeof doc.text!=='string'||!doc.text.trim()||doc.text.length>10000||!/^DOC[1-9]\d?$/.test(id))throw Error('SYNTHETIC_INPUT_REQUIRED');
 const units=[];
 // Split only at explicit line/semicolon/sentence boundaries, never in a number or name.
 const segments=doc.text.matchAll(/[^\r\n;]+(?:;|$)|[^\r\n;]+(?=\r?\n)/g);
 for(const m of segments){let raw=m[0];if(raw.endsWith(';'))raw=raw.slice(0,-1);let base=m.index;
  const pieces=raw.length>220?[...raw.matchAll(/.+?(?:[.!?](?=\s+[A-Z가-힣])|$)/gu)]:[{0:raw,index:0}];
  for(const part of pieces){const text=part[0].trim();if(!text)continue;const start=base+part.index+part[0].length-part[0].trimStart().length;if(text.length>220)throw Error('PHRASE_TOO_LONG_KEEP_DRAFT');units.push({ref:'r'+(units.length+1),text,start,end:start+text.length,label:labelOf(text)});}
 }
 if(!units.length||units.length>60)throw Error('PHRASE_LIMIT_KEEP_DRAFT');
 return {id,kind:doc.kind,sourceSignature:documentSignature(doc),units};
}
export async function bindEvidence(doc,id){const e=evidenceFor(doc,id);return {...e,sourceSha256:await sha(e.sourceSignature),units:await Promise.all(e.units.map(async u=>({...u,sha256:await sha(JSON.stringify({source:e.sourceSignature,start:u.start,end:u.end,text:u.text}))})))};}
export function observations(e){
 const amounts=[],currencies=[];
 for(const u of e.units){
  if(u.label?.field==='amount'){
   const m=u.label.value.match(/^(?:[A-Z]{3}\s*)?([0-9][0-9,.]*)(?:\s*원)?$/u);if(m){const value=normalize('amount',m[1]);if(value!==null)amounts.push({value,ref:u.ref,label:u.text.slice(0,u.text.indexOf(':'))});}
  }
  for(const m of u.text.matchAll(/\b(KRW|USD|EUR|JPY|CNY|GBP|AUD|CAD|CHF|HKD|SGD|INR|VND|THB)\b|원(?=\s|$)|[$€¥₩]/gu))currencies.push({value:m[0]==='원'||m[0]==='₩'?'KRW':m[0],ref:u.ref});
  if(u.label?.field==='currency'&&!currencies.some(c=>c.ref===u.ref&&c.value===u.label.value))currencies.push({value:u.label.value.toUpperCase(),ref:u.ref});
  if(['amount','unitPrice'].includes(u.label?.field)){const code=u.label.value.match(/^([A-Z]{3})\b/)?.[1];if(code&&!currencies.some(c=>c.ref===u.ref&&c.value===code))currencies.push({value:code,ref:u.ref});}
 }
 const amountValues=[...new Set(amounts.map(x=>x.value))],currencyValues=[...new Set(currencies.map(x=>x.value))];
 // Multiple same-value Amount/Fare lines can describe separate transactions: never merge by value.
 const repeatedAmountLabels=amounts.some((a,i)=>amounts.slice(0,i).some(b=>b.label.toLowerCase()===a.label.toLowerCase()));
 return {amounts,amountValues,currencies,currencyValues,repeatedAmountLabels,unsupportedCurrencies:currencyValues.filter(x=>x!=='KRW')};
}
