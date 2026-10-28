import {sig} from "./../../../../core.mjs";import {documents,reply} from "./../fixtures.mjs";import {MODEL} from "./request.mjs";
export function envelope(value=reply()){return JSON.stringify({model:MODEL,choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}],usage:{prompt_tokens:1800,completion_tokens:700}});}
export async function providerDouble(d,{fixture='normal',delayMs=0}={}){if(sig(d)!==sig(documents)||fixture!=='normal')throw Error('OFFLINE_ANNOTATION_UNAVAILABLE');if(delayMs)await new Promise(r=>setTimeout(r,delayMs));return new Response(envelope(),{status:200});}
