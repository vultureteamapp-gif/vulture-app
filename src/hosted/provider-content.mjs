const die=code=>{throw Object.assign(Error(code),{code});};
function incompleteContainer(text){
 const stack=[];let quoted=false,escaped=false;
 for(const c of text){
  if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"')quoted=true;else if(c==='{'||c==='[')stack.push(c);
  else if(c==='}'||c===']'){if(stack.pop()!==(c==='}'?'{':'['))return false;}
 }
 return /^[\s]*[\[{]/.test(text)&&(quoted||stack.length>0);
}
export function contentDiagnostics(envelope){
 const choice=envelope?.choices?.[0],content=choice?.message?.content;
 return {finishReason:choice?.finish_reason??null,contentPresent:typeof content==='string'&&content.trim().length>0,contentCharacters:typeof content==='string'?content.length:0,reasoningTokens:envelope?.usage?.completion_tokens_details?.reasoning_tokens??null};
}
export function parseFinalContent(envelope){
 const choice=envelope?.choices?.[0],content=choice?.message?.content;
 if(choice?.finish_reason==='length')die('MODEL_OUTPUT_TRUNCATED');
 if(choice?.message?.refusal)die('MODEL_REFUSED');
 if(content===null||content===undefined||typeof content==='string'&&!content.trim())die('MODEL_CONTENT_MISSING');
 if(typeof content!=='string')die('MODEL_CONTENT_TYPE_INVALID');
 if(choice?.finish_reason!=='stop')die('MODEL_COMPLETION_NOT_FINAL');
 let reply;try{reply=JSON.parse(content);}catch{die(incompleteContainer(content)?'MODEL_JSON_INCOMPLETE':'MODEL_INVALID_JSON');}
 if(!reply||typeof reply!=='object'||Array.isArray(reply))die('MODEL_SCHEMA_INVALID');
 return reply;
}
