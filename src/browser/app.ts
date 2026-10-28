import {createReviewGuard,withUIActivity} from "./profiles/payment-003/quote-contract-004/connection/mobile-session-001/ux-pwa/review-guard.mjs";
import {installPwaTools} from "./profiles/payment-003/quote-contract-004/connection/mobile-session-001/ux-pwa/pwa-tools.mjs";
import {copyChecked} from "./copy-report.mjs";
import {createFixedTrialLoader,backupTrialDraft,replaceTrialDraft} from "./fixed-trial-loader.mjs";
import {providerErrorCopy} from "./provider-error-copy.mjs";

import {analyze,makePlan,examples,documentSignature,sig,VERSION,savedReceiptFor} from "./core.mjs";
import {readSynthetic,commitSynthetic,dailyReport} from "./storage.ts";
import {offlineInterpret} from "./model-contract.mjs";
import{requestPayment003 as requestFor,validatePayment003 as validateReply}from"./profiles/payment-003/phrase-evidence-006/execution-connection/request.mjs";
import{PIN as fixedRequestPin}from"./profiles/payment-003/phrase-evidence-006/execution-connection/pins.mjs";
import{channel as trialChannel,storagePrefix}from"./profiles/payment-003/phrase-evidence-006/execution-connection/scope.mjs";
import{acceptWorkflowResult}from"./profiles/payment-003/phrase-evidence-006/execution-connection/workflow.mjs";
const $=(id:string)=>document.getElementById(id) as any;
const LANG='vulture-language-013',DRAFT=storagePrefix+'document-confirm-002:draft:';
let lang=localStorage.getItem(LANG)==='ko'?'ko':'en',actor=JSON.parse(localStorage.getItem(storagePrefix+'recovery-selected-actor')??'null')==='admin'?'synthetic-admin':'synthetic-driver';
let plan:any=null,interpreted:any=null,receipt:any=null,answers:any={},decision='',busy=false,revision=0,report='',lastSource='',interpretMode='local-template-rules';
let batch:any=null,batchIndex=0,providerCache:any=null;
let reviewerLiveReady=false;
const statusTranslations=new Map<string,[string,string]>();
const t=(en:string,ko:string)=>{statusTranslations.set(en,[en,ko]);statusTranslations.set(ko,[en,ko]);return lang==='ko'?ko:en;};
const names:any={date:['Date','날짜'],vehicle:['Vehicle','차량'],origin:['From','상차지'],destination:['To','하차지'],departure:['Departure (HH:mm)','출발시각 (HH:mm)'],amount:['Amount (KRW)','금액 (KRW)'],currency:['Currency','통화'],liters:['Liters','리터'],unitPrice:['Unit price (KRW)','단가 (KRW)'],station:['Station','주유소'],reference:['Reference','승인번호'],status:['Status','상태'],action:['Action','작업'],merchant:['Merchant','가맹점'],paymentState:['Payment status','결제 상태'],purpose:['Purpose','용도'],memo:['Optional note','선택 메모']};
function label(f:string){return names[f]?t(...names[f]):f;}
function message(text:string,error=false){$('status').textContent=text;$('status').className=error?'error':'notice';}
function doc(){return {kind:$('kind').value,text:$('source').value,syntheticOnly:$('synthetic').checked};}
function currentDraft(){return {kind:$('kind').value,text:$('source').value,synthetic:$('synthetic').checked,answers:structuredClone(answers),decision,receiptId:receipt?.id??null,batch:structuredClone(batch),batchIndex};}
function draft(){try{localStorage.setItem(DRAFT+actor,JSON.stringify(currentDraft()));}catch{message(t('Draft could not be saved. Confirmed records were not changed.','초안 저장 실패. 확인 기록은 변경하지 않았습니다.'),true);}}
function invalidate(saveDraft=true){revision++;$('provider-raw').textContent='';$('provider-meta').textContent='';$('provider-state').textContent=t('Input changed — prior provider response is not the current analysis.','입력 변경 — 이전 제공자 응답은 현재 분석이 아닙니다.');if(batch)batch[batchIndex]=doc();$('payment-checks').hidden=doc().kind!=='payment';$('vehicle-hint').textContent='';$('model-hints').textContent='';for(const id of ['purpose','vehicle-check','memo'])if($(id))$(id).value='';$('details-json').textContent='';$('duplicate').hidden=true;$('link').replaceChildren();$('interpretation').textContent=t('No current review. Review the changed source first.','현재 분석 없음. 변경된 원문을 먼저 검토하세요.');plan=null;interpreted=null;receipt=null;answers={};decision='';report='';$('checked').checked=false;$('final').hidden=true;$('confirm').disabled=true;$('questions').replaceChildren();$('evidence').replaceChildren();$('preview').textContent='';$('copy').disabled=true;$('download').disabled=true;if(saveDraft){draft();renderTrialLoadState({status:'idle'});}message(t('Input changed. Review and confirm again; previous analysis/report is invalid.','입력이 바뀌었습니다. 이전 분석·확인·보고는 무효입니다. 다시 검토하세요.'));}
function localize(){document.documentElement.lang=lang;const currentStatus=$('status').textContent;const translatedStatus=statusTranslations.get(currentStatus);if(translatedStatus)$('status').textContent=translatedStatus[lang==='ko'?1:0];for(const e of document.querySelectorAll('[data-en]'))e.textContent=lang==='ko'?(e as HTMLElement).dataset.ko!:(e as HTMLElement).dataset.en!;$('language').value=lang;if(plan)renderPlan();if(receipt)renderReport();if(!plan)$('interpretation').textContent=t('Local supported-template rules. No new model call.','지원 서식의 로컬 규칙 처리. 새 모델 호출 없음.');renderTrialLoadState(trialLoadState);const providerText=$('provider-state').textContent,providerPair=statusTranslations.get(providerText);if(providerPair)$('provider-state').textContent=providerPair[lang==='ko'?1:0];}
function renderPlan(){
 $('payment-checks').hidden=doc().kind!=='payment';if(doc().kind==='payment'){$('model-hints').textContent=(plan.analysis.paymentTypeSuggestions??[]).map(p=>t('Suggested payment type (unconfirmed): ','분류 후보 (미확인): ')+p.type).join(' | ');$('vehicle-hint').textContent=plan.analysis.vehicleSuggestion?t('Card match suggestion: ','카드 일치 후보: ')+plan.analysis.vehicleSuggestion+t(' — choose after checking.',' — 확인 후 선택하세요.'):t('Vehicle is not confirmed. Select after checking.','차량 미확인. 확인 후 선택하세요.');}

 const a=plan.analysis;
 const selector=$('vehicle-check'),priorVehicle=answers.vehicle??selector.value;
 for(const value of [...a.candidates.vehicle.map((c:any)=>c.value),priorVehicle])if(value&&!Array.from(selector.options).some((o:any)=>o.value===value)){const option=document.createElement('option');option.value=value;option.textContent=value;selector.append(option);}selector.value=priorVehicle;
 if(answers.vehicle&&doc().kind==='payment')$('vehicle-hint').textContent=t('Your selected vehicle: ','사용자가 선택한 차량: ')+answers.vehicle+t(' — check the source before saving.',' — 저장 전 원문을 확인하세요.');
 $('phrase-assessment').textContent=executionAnalysisCopy(a);
 $('model-questions').textContent=t('MODEL suggestions: ','모델 질문 후보: ')+JSON.stringify(a.questionCandidates)+ '\n'+t('CODE checks: ','코드 확인 질문: ')+JSON.stringify(a.codeQuestions)+ '\n'+t('Omission diagnostics (kept after human completion): ','사용자 보완 뒤에도 보존하는 누락 진단: ')+JSON.stringify(a.missingModelQuestions);
 $('evidence').replaceChildren();const table=document.createElement('table');const head=document.createElement('tr');for(const h of [t('Field','필드'),t('Candidate','후보'),t('Source quote','원문 인용')]){const th=document.createElement('th');th.textContent=h;head.append(th);}table.append(head);
 for(const [field,cs] of Object.entries(a.candidates) as any){if(!cs.length)continue;for(const c of cs){const tr=document.createElement('tr');for(const value of [label(field),c.value===null?t('Unconfirmed','미확인'):String(c.value),c.quote]){const td=document.createElement('td');td.textContent=value;tr.append(td);}table.append(tr);}}for(const hold of a.invalidCandidates??[]){const tr=document.createElement('tr');tr.className='error';for(const value of [label(hold.field),t('UNCONFIRMED — ','미확정 — ')+String(hold.proposal?.value??''),String(hold.proposal?.ref??'')+' | '+hold.code]){const td=document.createElement('td');td.textContent=value;tr.append(td);}table.append(tr);}$('evidence').append(table);
 $('questions').replaceChildren();const seen=new Set();for(const q of plan.questions){if(['duplicateDecision','purpose','vehicle','memo'].includes(q.field)&&doc().kind==='payment'||q.field==='duplicateDecision'||seen.has(q.field))continue;seen.add(q.field);const wrap=document.createElement('label');wrap.textContent=label(q.field)+' — '+(q.code==='REFUND_NOT_SUPPORTED_KEEP_DRAFT'?t('Cancellation/refund is unresolved. Keep the original text as a draft; no amount is changed.','취소·환불 미확인. 원문을 초안으로 유지하며 금액을 변경하지 않습니다.'):q.code==='fuel-amount-conflict'?t('Fuel total conflicts with liters × price. Verify source; no automatic correction.','주유 총액과 리터×단가 불일치. 원문 확인 후 직접 수정하세요.'):q.code==='CANCEL_TARGET_NOT_FOUND_KEEP_DRAFT'?t('No matching confirmed load. Check the reference or keep this as a draft.','일치하는 확인 배차가 없습니다. 참조번호를 확인하거나 초안으로 보류하세요.'):q.code==='ALREADY_CANCELLED_KEEP_DRAFT'?t('This load is already cancelled. No second cancellation will be saved.','이미 취소된 배차입니다. 중복 취소를 저장하지 않습니다.'):q.code.includes('USD')||q.code.includes('KRW')?t('This workflow supports KRW only; no conversion.','이번 흐름은 KRW만 지원하며 환산하지 않습니다.'):t('Missing, invalid or conflicting. Enter the checked value.','누락·오류·충돌 값입니다. 확인한 값을 입력하세요.'));
 wrap.textContent=t('CODE check / ','코드 확인 / ')+wrap.textContent+' ['+q.code+']';
 if(q.field==='sourceReview'){wrap.textContent+=t(' Keep this draft and split/check the source. Saving is blocked.',' 초안으로 보류하고 원문을 분리·확인하세요. 저장은 차단됩니다.');$('questions').append(wrap);continue;}
 const input=document.createElement('input');input.id='answer-'+q.field;input.dataset.field=q.field;input.value=answers[q.field]??'';input.setAttribute('aria-label',label(q.field));if(['amount','liters','unitPrice'].includes(q.field))input.inputMode='decimal';input.addEventListener('input',()=>{answers[q.field]=input.value;revision++;plan=null;$('preview').textContent=t('Your answer changed. Preview again before confirming.','답변이 바뀌었습니다. 확인 전에 다시 미리보기 하세요.');$('confirm').disabled=true;$('checked').checked=false;receipt=null;report='';$('copy').disabled=true;$('download').disabled=true;$('final').hidden=true;draft();});wrap.append(input);$('questions').append(wrap);}
 $('duplicate').hidden=!plan.duplicates.length;if(plan.duplicates.length){$('link').replaceChildren();for(const [value,name] of [...(plan.operation==='cancel'?[['',t('Choose the load to cancel','취소할 배차 확인')],...plan.duplicates.map((d:any)=>['cancel:'+d.id,t('Cancel confirmed load ','확인된 배차 취소: ')+d.id])]:[['',t('Choose after checking','확인 후 선택')],['independent',t('A separate transaction — add once','별도 거래 — 한 번 추가')],...plan.duplicates.map((d:any)=>['link:'+d.id,t('Same transaction — attach evidence to ','같은 거래 — 증빙 연결: ')+d.id])])]){const o=document.createElement('option');o.value=value;o.textContent=name;$('link').append(o);}$('link').value=decision;$('duplicate-list').textContent=plan.duplicates.map(d=>d.date+' | '+d.vehicle+' | KRW '+Number(d.amount).toLocaleString('en-US')+' | '+(d.reference??t('Reference unconfirmed','승인번호 미확인'))).join('\n');}
 $('preview').textContent=[plan.privateOnly?t('One private payment will be kept locally after confirmation. Excluded from business totals and reports.','확인 후 개인 기록에만 보관합니다. 업무 합계·보고에서는 제외됩니다.'):plan.operation==='cancel'?t('Cancel the selected synthetic load only after confirmation. The original source and fare remain in history.','확인 후 선택한 합성 배차만 취소합니다. 원문·운임 이력은 보존합니다.'):plan.sourceAlreadyConfirmed?t('Already saved — no duplicate save','저장된 자료 — 중복 저장 없음'):decision.startsWith('link:')?t('Attach evidence only; no new cost','증빙 연결만; 비용 추가 없음'):t('One synthetic record will be added only after confirmation','확인 후에만 합성 기록 한 건이 추가됩니다'),...Object.entries(plan.values).map(([f,v])=>label(f)+': '+String(v)+(plan.human.some(h=>h.field===f)?t(' (your checked answer)',' (사용자 확인 답변)'):''))].join('\n');
 $('confirm').disabled=!plan.canConfirm||!$('checked').checked||busy||mobileResponseBlocked;
 $('details-json').textContent=JSON.stringify({version:VERSION,extractionSource:a.source,liveModelVerified:false,sourceSignature:a.signature,questions:plan.questions,duplicateRecords:plan.duplicates,evidenceCandidates:a.candidates,modelQuestionCandidates:a.questionCandidates??[],classificationCandidates:a.paymentTypeSuggestions??[],relatedDocumentCandidates:a.relatedDocumentSuggestions??[],semanticModelVerified:false},null,2);
 $('interpretation').textContent=a.source==='live-provider-response'?t('REAL PROVIDER RESPONSE — source/contract checks passed; semantic correctness still needs review.','실제 제공자 응답 — 출처·계약 검사 통과. 의미 정확성은 검토가 필요합니다.'):a.source==='saved-provider-response'?t('SAVED RESPONSE — see original source below. No new call.','저장 응답 — 아래 원래 출처를 확인하세요. 새 호출 없음.'):a.source?.includes('offline')?t('OFFLINE PROVIDER — simulated response, no real call.','제공자 대역 — 모의 응답, 실제 호출 없음.'):t('LOCAL RULES — no model call.','로컬 규칙 — 모델 분석 아님.');
 $('interpretation').textContent=executionAnalysisCopy(a);if(plan.sourceAlreadyConfirmed)message(t('This source was already confirmed. No duplicate record will be added.','이미 확인된 원문입니다. 중복 저장하지 않습니다.'));
 else message(plan.questions.length?t('Answer only the gaps/conflicts, then preview again. Nothing saved.','누락·충돌 항목만 답한 뒤 다시 미리보기 하세요. 아직 저장되지 않았습니다.'):t('Change preview ready. Check the source and explicitly confirm to save.','변경 미리보기 준비. 원문 확인 후 명시적으로 확인해야 저장됩니다.'));
}
async function reviewCore(mode:string){mobileFeedback(t('Use the offline phrase review above. No model call.','위의 구절 근거 대역 검토를 사용하세요. 모델 호출 없음.'),true);return;
 if(trialChannel==='real'){providerFailure(t('A valid real response is required in this isolated real-trial area. No rule or sample substitution.','실모델 시험 영역은 유효한 실제 응답이 필요합니다. 규칙·대역 대체 없음.'));return;}
 if(busy)return;busy=true;revision++;const rev=revision,d=doc();receipt=null;report='';$('final').hidden=true;$('confirm').disabled=true;$('checked').checked=false;$('analyze').disabled=true;$('double').disabled=true;message(t('Reviewing locally…','로컬 검토 중…'));
 try{const result=mode==='offline-test-double'?await offlineInterpret(d,{delayMs:$('test-delay').checked?900:0}):analyze(d);if(rev!==revision)return;interpreted=result;interpretMode=mode;const snapshot=readSynthetic(actor);plan=makePlan(d,answers,snapshot,decision,result);renderPlan();if(plan.sourceAlreadyConfirmed){receipt=snapshot.documentInbox.confirmations.findLast(c=>c.sourceSignature===documentSignature(d)&&c.planSignature===plan.planSignature);if(receipt){lastSource=documentSignature(d);renderReport();draft();}}}
 catch(e:any){if(rev!==revision)return;plan=null;message(t('Review failed: ','검토 실패: ')+e.message,true);}
 finally{busy=false;$('analyze').disabled=false;$('double').disabled=false;if(plan)$('confirm').disabled=!plan.canConfirm||!$('checked').checked;}
}
function renderReport(){
 if(receipt?.private){$('final').hidden=true;report='';message(t('Saved privately in this synthetic account only. Excluded from business records, profit and the daily report. No company sharing.','이 합성 계정의 개인 기록에만 저장했습니다. 업무 장부·손익·일일보고에서는 제외되며 회사 공유는 없습니다.'));return;}
 if(!receipt||lastSource!==documentSignature(doc())){$('final').hidden=true;return;}
 try{report=dailyReport(readSynthetic(actor),{date:receipt.date,vehicle:receipt.vehicle,actor},lang);$('report').textContent=report;
 const p=receipt.reviewProvenance;$('completion-proof').textContent=executionCompletionCopy(p);$('final').hidden=false;$('copy').disabled=false;$('download').disabled=false;}catch(e:any){report='';$('final').hidden=true;message(t('Report blocked: ','보고서 차단: ')+e.message,true);}
}
async function confirmCore(){
 if(trialChannel==='real'&&(!providerCache||providerCache.source!=='new-live-response'||sig(providerCache.documents)!==sig(documents()))){providerFailure(t('No current valid real result. Saving is blocked.','현재 유효한 실모델 결과가 없어 저장을 차단했습니다.'));return;}
 if(busy||!plan||!plan.canConfirm||!$('checked').checked)return;if(!navigator.locks){message(t('Web Locks unavailable; safe confirmation is blocked.','Web Locks 미지원으로 안전한 저장을 차단했습니다.'),true);return;}
 busy=true;$('confirm').disabled=true;const captured=revision,confirmedPlan=plan,d=doc();
 try{const result=await navigator.locks.request(storagePrefix+'vulture-document-confirm:'+actor,()=>{if(captured!==revision)throw Error('INPUT_CHANGED');return commitSynthetic(actor,confirmedPlan,d,true);});receipt=result.receipt;lastSource=documentSignature(d);plan={...confirmedPlan,canConfirm:false,sourceAlreadyConfirmed:true};$('confirm').disabled=true;draft();message(t('Saved once to this synthetic account. The report uses confirmed records and shared calculations.','이 합성 계정에 저장했습니다. 일일보고에는 확인 기록만 포함됩니다.'));renderReport();}
 catch(e:any){receipt=null;report='';$('final').hidden=true;message(e.message==='SAVE_READBACK_MISMATCH'?t('Save status is uncertain. Do not save again. Reload and review the stored source first.','저장 상태가 불명확합니다. 재저장하지 말고 새로고침 후 저장된 원문부터 확인하세요.'):t('Save failed; no confirmation: ','저장 실패; 확인 완료 아님: ')+e.message,true);}
 finally{busy=false;}
}
function restore(){providerCache=null;interpreted=null;$('provider-raw').textContent='';$('provider-meta').textContent='';$('provider-state').textContent='';$('details-json').textContent='';$('duplicate').hidden=true;$('link').replaceChildren();message(t('Unconfirmed draft. Review before saving.','미확인 초안입니다. 저장 전에 검토하세요.'));plan=null;receipt=null;answers={};decision='';report='';$('final').hidden=true;$('confirm').disabled=true;$('questions').replaceChildren();$('evidence').replaceChildren();$('preview').textContent='';$('checked').checked=false;let d:any=null;try{d=JSON.parse(localStorage.getItem(DRAFT+actor)??'null');}catch{message(t('Draft is corrupt; confirmed records were not reset.','초안이 손상됐습니다. 확인 기록은 초기화하지 않았습니다.'),true);}
 batch=d?.batch??null;batchIndex=d?.batchIndex??0;updateBatchControl();answers=d?.answers??{};for(const [id,f]of [['purpose','purpose'],['vehicle-check','vehicle'],['memo','memo']])$(id).value=answers[f]??'';$('payment-checks').hidden=(d?.kind??'load')!=='payment';decision=d?.decision??''; $('kind').value=d?.kind??'load';$('source').value=d?.text??'';$('synthetic').checked=d?.synthetic===true;
 try{const s=readSynthetic(actor),saved=savedReceiptFor(s,doc(),d?.receiptId);if(saved){receipt=saved;lastSource=saved.sourceSignature;renderReport();message(t('Saved confirmed records replayed after refresh. No new analysis or save.','새로고침 후 저장된 확인 기록 재생. 새 분석·저장 없음.'));}}catch(e:any){message(e.message,true);}
}
function editChecked(){revision++;plan=null;receipt=null;report='';$('preview').textContent=t('Your choices changed. Preview again before confirming.','선택이 바뀌었습니다. 확인 전에 다시 미리보기 하세요.');$('checked').checked=false;$('confirm').disabled=true;$('final').hidden=true;$('copy').disabled=true;$('download').disabled=true;draft();}
for(const [id,field]of [['purpose','purpose'],['vehicle-check','vehicle'],['memo','memo']])$(id).addEventListener('input',()=>{answers[field]=$(id).value;editChecked();});
$('language').addEventListener('change',()=>{lang=$('language').value;try{localStorage.setItem(LANG,lang);}catch{}localize();});
$('actor').value=actor;$('actor').addEventListener('change',()=>{draft();revision++;actor=$('actor').value;localStorage.setItem(storagePrefix+'recovery-selected-actor',JSON.stringify(actor==='synthetic-driver'?'driver':'admin'));restore();});
for(const id of ['kind','source','synthetic'])$(id).addEventListener('input',invalidate);
for(const kind of ['load','fuel','payment'])$('sample-'+kind).addEventListener('click',()=>{batch=null;batchIndex=0;updateBatchControl();$('kind').value=kind;$('source').value=examples[kind];$('synthetic').checked=true;invalidate();});
$('analyze').addEventListener('click',()=>review('local-template-rules'));$('double').addEventListener('click',()=>review('offline-test-double'));$('repreview').addEventListener('click',()=>{if(interpreted&&interpreted.signature===documentSignature(doc())){try{plan=makePlan(doc(),answers,readSynthetic(actor),decision,interpreted);renderPlan();}catch(e:any){message(e.message,true);}}else review('local-template-rules');});
$('link').addEventListener('change',()=>{decision=$('link').value;revision++;plan=null;receipt=null;report='';$('copy').disabled=true;$('download').disabled=true;draft();$('checked').checked=false;$('confirm').disabled=true;$('final').hidden=true;});
$('checked').addEventListener('change',()=>{$('confirm').disabled=!plan?.canConfirm||!$('checked').checked||busy||mobileResponseBlocked;});
$('confirm').addEventListener('click',confirm);
$('later').addEventListener('click',()=>{revision++;plan=null;interpreted=null;receipt=null;report='';$('checked').checked=false;$('confirm').disabled=true;$('final').hidden=true;$('copy').disabled=true;$('download').disabled=true;draft();message(t('Kept as an unconfirmed draft. No record or final report was created.','미확인 초안으로 유지했습니다. 확정 기록·최종 보고는 생성하지 않았습니다.'));});
function selectReport(){const node=$('report');node.focus();const range=document.createRange();range.selectNodeContents(node);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);}
$('copy').addEventListener('click',async()=>{renderReport();if(!report)return;const result=await copyChecked(report,{write:s=>navigator.clipboard.writeText(s),read:navigator.clipboard?.readText?()=>navigator.clipboard.readText():null});if(result==='verified')message(t('Report copied and read back in this browser.','이 브라우저에서 보고서 복사와 읽기 확인을 마쳤습니다.'));else{selectReport();message(t('Automatic clipboard copy could not be verified. The report is selected: press Ctrl+C, or use Copy from the text menu.','자동 복사를 확인하지 못했습니다. 보고서가 선택됐습니다. Ctrl+C 또는 텍스트 메뉴의 복사를 사용하세요.'));}});
$('select-report').addEventListener('click',()=>{renderReport();if(!report)return;selectReport();message(t('Report selected. Press Ctrl+C or use the text Copy menu.','보고서 선택 완료. Ctrl+C 또는 텍스트 복사 메뉴를 사용하세요.'));});
$('download').addEventListener('click',()=>{renderReport();if(!report)return;const url=URL.createObjectURL(new Blob([report],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='vulture-synthetic-daily-report-'+receipt.date+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
addEventListener('storage',e=>{if(e.key===storagePrefix+'fleet-store-v1:'+actor){revision++;plan=null;receipt=null;report='';$('confirm').disabled=true;$('final').hidden=true;message(t('Records changed in another tab. Preview again.','다른 탭에서 기록이 바뀌었습니다. 다시 미리보기 하세요.'));}});
function documents(){if(batch){const out=structuredClone(batch);out[batchIndex]=doc();return out;}return[doc()];}
function updateBatchControl(){$('trial-documents').hidden=!batch;$('trial-index').replaceChildren();if(batch)batch.forEach((d:any,i:number)=>{const o=document.createElement('option');o.value=String(i);o.textContent='DOC'+(i+1)+' — '+d.kind;$('trial-index').append(o);});$('trial-index').value=String(batchIndex);}
function providerFailure(text:string){$('evidence').replaceChildren();$('questions').replaceChildren();$('preview').textContent='';$('interpretation').textContent=t('No current accepted provider analysis.','현재 승인된 제공자 분석 없음.');plan=null;interpreted=null;receipt=null;report='';$('checked').checked=false;$('confirm').disabled=true;$('final').hidden=true;$('copy').disabled=true;$('download').disabled=true;$('provider-state').textContent=text;message(text,true);}
async function readJSON(response:Response){const value=await response.json();if(!response.ok)throw Error(value.error??'DOCUMENT_REQUEST_FAILED');return value;}
async function applyProviderResult(result:any,expectedDocs:any,rev:number){if(rev!==revision||result.actor!==actor||sig(expectedDocs)!==sig(documents())){providerFailure(t('Input changed: the previous provider result was not applied. No fallback or save.','입력이 바뀌어 이전 제공자 결과를 적용하지 않았습니다. 대체·저장 없음.'));return;}
 $('provider-raw').textContent=result.rawResponse??'';$('provider-meta').textContent=JSON.stringify({source:result.source,displayMode:result.displayMode,trialId:result.trialId,httpStatus:result.httpStatus,usage:result.usage,usageState:result.usageState,requestSha256:result.requestSha256,status:result.status,error:result.error,externalPostAttempts:result.externalPostAttempts,automaticRetries:result.automaticRetries,bill:result.bill,diagnostics:result.diagnostics??null,semanticVerified:false},null,2);if(result.status!=='REVIEWABLE_DRAFT'){providerFailure(t(providerErrorCopy(result.error,'en'),providerErrorCopy(result.error,'ko')));return;}if(sig(result.documents)!==sig(expectedDocs)||(await requestFor(expectedDocs)).requestSha256!==result.requestSha256)throw Error('RESPONSE_INPUT_MISMATCH');
 if((trialChannel==='real')!==(result.source==='new-live-response'))throw Error('RESPONSE_CHANNEL_MISMATCH');const {analyses,source}=await acceptWorkflowResult(result,expectedDocs);if(rev!==revision)return;providerCache={...result,analysis:analyses};interpreted=analyses[batch?batchIndex:0];interpretMode=source;plan=makePlan(doc(),answers,readSynthetic(actor),decision,interpreted);renderPlan();$('provider-state').textContent=result.simulation===true?t('SIMULATED TRANSPORT — not a real model response.','전송 대역 — 실제 모델 응답 아님.'):result.displayMode==='saved-response-replay'?(result.source==='new-live-response'?t('SAVED REAL RESPONSE REPLAY — no new call.','저장된 실제 응답 재생 — 새 호출 없음.'):t('SAVED OFFLINE RESPONSE REPLAY — no real call.','저장된 대역 응답 재생 — 실제 호출 없음.')):source==='live-provider-response'?t('REAL HTTP response — review the grounded suggestions; not an automatic save.','실제 HTTP 응답 — 근거 후보를 검토하세요. 자동 저장 아님.'):t('OFFLINE PROVIDER RESPONSE — simulated transport and model output. No real AI call.','제공자 대역 응답 — 전송·모델 출력 시뮬레이션. 실제 AI 호출 없음.');}

const mobileReviewGuard=createReviewGuard();
let mobileResponseBlocked=false;
function mobileFeedback(text:string,error=false,move=false){
 for(const id of ['review-feedback','replay-feedback']){
  const el=$(id);if(!el)continue;el.textContent=text;el.hidden=false;
  el.className=error?'error':'notice';el.setAttribute('role',error?'alert':'status');
 }
 if(move){const target=$('questions').closest('section');target?.scrollIntoView({block:'start',behavior:'auto'});const heading=target?.querySelector('h2');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});}
}
function requestBlocked(code:string){
 if(!['DUPLICATE_INPUT_COOLDOWN','DOCUMENT_REQUEST_BUSY'].includes(code)){mobileFeedback(t('Request blocked; existing results and answers are kept. ','요청 차단. 기존 결과와 답변을 유지했습니다. ')+code,true);return;}
 mobileFeedback(code==='DUPLICATE_INPUT_COOLDOWN'
  ?t('That input was just reviewed. Existing results and your answers were kept. No new review or save.','방금 검토한 입력입니다. 기존 결과와 답변을 유지했습니다. 새 검토·저장 없음.')
  :t('A review or save is in progress. Existing results and your answers were kept.','검토 또는 저장 중입니다. 기존 결과와 답변을 유지했습니다.'),true);
}
function mobileButtons(pending:boolean){
 for(const id of ['provider-review','provider-replay','analyze','double','repreview','trial-load','trial-replace'])if($(id))$(id).disabled=pending||id==='provider-review'&&channel==='real';
 $('provider-review').setAttribute('aria-busy',String(pending));
 $('provider-replay').setAttribute('aria-busy',String(pending));
 $('confirm').disabled=pending||mobileResponseBlocked||!plan?.canConfirm||!$('checked').checked;
 $('provider-live').disabled=pending||!reviewerLiveReady||channel!=='real';
}
async function providerReview(mode:string){
 if(mode!=='offline'&&(mode!=='live'||!reviewerLiveReady||channel!=='real')){mobileFeedback(t('A new real call needs an active, separately approved reviewer allowance. Saved results and answers are kept.','새 실제 호출은 별도 승인된 심사 기간·잔여 한도가 필요합니다. 기존 결과·답변은 유지합니다.'),true);return;}
 if(busy){requestBlocked('DOCUMENT_REQUEST_BUSY');return;}
 const input=documents(),selectedActor=actor,key=sig({actor,input,mode,fixture:$('provider-fixture').value});
 const start=mobileReviewGuard.begin(key);if(!start.ok){requestBlocked(start.code);return;}
 busy=true;const rev=revision;let accepted=false,validating=false;mobileButtons(true);
 mobileFeedback(t('Reviewing these sources… Your previous result and answers remain visible. Nothing is saved.','원문 검토 중… 이전 결과와 답변은 유지됩니다. 저장하지 않습니다.'));
 try{await withUIActivity(storagePrefix,async()=>{
  const prepared=await readJSON(await fetch('/api/document/prepare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actor:selectedActor,documents:input}),signal:AbortSignal.timeout(10000)}));
  const client=await requestFor(input);if(prepared.requestSha256!==client.requestSha256)throw Error('PREPARE_HASH_MISMATCH');
  if(rev!==revision||actor!==selectedActor)return;
  const result=await readJSON(await fetch('/api/document/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,actor:selectedActor,documents:input,requestSha256:prepared.requestSha256,requestId:'document-meaning-ui-'+crypto.randomUUID(),fixture:$('provider-fixture').value,delayMs:$('test-delay').checked}),signal:AbortSignal.timeout(45000)}));
  if(rev!==revision||actor!==selectedActor||sig(input)!==sig(documents())){mobileFeedback(t('Input changed. The arriving response was not applied. Your latest input was kept.','입력이 변경됐습니다. 도착한 응답은 적용하지 않았고 최신 입력을 유지했습니다.'),true);return;}
  validating=true;await applyProviderResult(result,input,rev);
  accepted=result.status==='REVIEWABLE_DRAFT'&&!!interpreted&&rev===revision;
  mobileResponseBlocked=!accepted;
  if(accepted)mobileFeedback(mode==='live'?t('Real response ready. Check valid suggestions and unresolved questions before saving.','실제 응답 도착. 유효 후보·미확정 질문을 확인한 후 저장하세요.'):t('Reviewable offline draft ready; no external call or automatic save.','대역 검토 완료. 아래 근거와 질문을 확인하세요. 실제 AI 호출·자동 저장 없음.'),false,true);
  else mobileFeedback(t('The response failed validation. It cannot be saved. See the failure details.','응답 검증에 실패해 저장할 수 없습니다. 실패 상세를 확인하세요.'),true);
 });}catch(e:any){
  if(rev!==revision||actor!==selectedActor){mobileFeedback(t('Input changed while waiting. Your latest draft was kept; no response was applied.','대기 중 입력이 변경됐습니다. 최신 초안을 유지하며 응답을 적용하지 않았습니다.'),true);}
  else if(['DUPLICATE_REQUEST','DUPLICATE_INPUT_COOLDOWN','DOCUMENT_REQUEST_BUSY','REVIEWER_QUOTA_EXHAUSTED','REVIEWER_PERIOD_INACTIVE','REVIEWER_APPROVAL_REQUIRED'].includes(e.message)){requestBlocked(e.message);}
  else if(validating||e.message==='PREPARE_HASH_MISMATCH'){
   mobileResponseBlocked=true;providerFailure(t('Response validation failed; saving blocked: ','응답 검증 실패; 저장 차단: ')+e.message);mobileFeedback($('provider-state').textContent,true);
  }else if(providerCache&&sig(providerCache.documents)===sig(input)&&interpreted){
   mobileResponseBlocked=true;
   mobileFeedback(t('New review failed. Previous results and answers are kept, not a new analysis. Saving is blocked until a valid review or explicit replay. Error: ','새 검토 실패. 이전 결과와 답변을 유지하며 새 분석은 아닙니다. 유효 검토 또는 명시적 재생 전 저장을 차단합니다. 오류: ')+e.message,true);
  }else{mobileResponseBlocked=true;providerFailure(t('Review failed. Nothing saved: ','검토 실패. 저장 없음: ')+e.message);mobileFeedback($('provider-state').textContent,true);}
 }finally{busy=false;mobileReviewGuard.finish(key,accepted);await refreshProviderStatus();mobileButtons(false);}
}
async function refreshProviderStatus(){try{const status=await readJSON(await fetch('/api/document/status'));reviewerLiveReady=status.liveReady===true; $('provider-live').disabled=busy||!reviewerLiveReady||channel!=='real'; $('provider-review').disabled=busy||channel==='real';$('provider-mode').textContent=status.liveReady?t('Reviewer period active — shared remaining calls: ','심사 기간 활성 — 전체 잔여 호출: ')+String(status.liveCallsRemaining??0):t('New real inference is blocked. Use rules, an offline provider or saved replay.','새 실제 추론 차단. 규칙·제공자 대역·저장 재생을 이용하세요.')+(status.reviewerPeriod?t(' Shared remaining: ',' 전체 잔여: ')+String(status.liveCallsRemaining)+' / 100. '+(status.reviewerPeriod.reason==='REVIEWER_QUOTA_EXHAUSTED'?t('Allowance exhausted. Saved results and local records remain available.','호출 한도 소진. 저장 응답과 로컬 기록은 계속 사용할 수 있습니다.'):status.reviewerPeriod.reason==='REVIEWER_PERIOD_INACTIVE'?t('Outside the approved judging period. Saved replay remains available.','승인된 심사 기간 밖입니다. 저장 재생은 계속 사용할 수 있습니다.'):''):'');}catch{reviewerLiveReady=false;$('provider-live').disabled=true;$('provider-mode').textContent=t('This server has no document provider endpoint. Use the independent 4201 runtime.','현재 서버에 문서 제공자 경로가 없습니다. 독립 4201 실행본을 사용하세요.');}}
$('provider-review').addEventListener('click',()=>providerReview('offline'));$('provider-live').addEventListener('click',()=>providerReview('live'));

$('provider-replay').addEventListener('click',async()=>{
 if(busy){requestBlocked('DOCUMENT_REQUEST_BUSY');return;}
 busy=true;mobileButtons(true);const rev=revision,input=documents(),selectedActor=actor;let validating=false;
 mobileFeedback(t('Opening the saved offline response… No new review or save.','저장된 대역 응답 여는 중… 새 검토·저장 없음.'));
 try{await withUIActivity(storagePrefix,async()=>{
  const r=await readJSON(await fetch('/api/document/last?actor='+selectedActor+'&channel='+trialChannel,{signal:AbortSignal.timeout(10000)}));
  if(rev!==revision||selectedActor!==actor||sig(input)!==sig(documents())){mobileFeedback(t('Input changed. Saved response was not applied.','입력이 변경돼 저장 응답을 적용하지 않았습니다.'),true);return;}
  validating=true;await applyProviderResult(r,input,rev);mobileResponseBlocked=!(r.status==='REVIEWABLE_DRAFT'&&interpreted&&rev===revision);
  if(r.status==='REVIEWABLE_DRAFT'&&interpreted&&rev===revision)mobileFeedback(t('Saved response replayed. Original offline / simulated / real origin is shown above. No new call or save.','저장 응답 재생. 위에서 대역·전송 모의·실제 응답 출처를 확인하세요. 새 호출·저장 없음.'),false,true);
  else mobileFeedback(t('Saved response failed validation; saving remains blocked.','저장 응답 검증 실패. 저장을 계속 차단합니다.'),true);
 });}catch(e:any){
  mobileResponseBlocked=true;
  if(validating)providerFailure(t('Saved response validation failed; saving blocked: ','저장 응답 검증 실패; 저장 차단: ')+e.message);
  mobileFeedback(t('Saved replay failed. Your input and answers were kept; saving is blocked. Error: ','저장 재생 실패. 입력과 답변을 유지하며 저장은 차단합니다. 오류: ')+e.message,true);
 }finally{busy=false;mobileButtons(false);}
});
let trialLoadState:any={status:'idle'};
function renderTrialLoadState(s:any){
 trialLoadState=s;
 $('trial-replace-panel').hidden=s.status!=='confirmation';
 $('trial-load-status').className=s.status==='error'?'error':'notice';
 $('trial-load-status').hidden=s.status==='idle';
 const errors:any={
  DRAFT_CHANGED:['Your input changed while loading. It was kept. Click Load fixed trial sources again.','불러오는 동안 입력이 변경되어 그대로 보존했습니다. Load fixed trial sources를 다시 누르세요.'],
  DRAFT_BACKUP_FAILED:['The previous draft could not be backed up. Nothing was replaced. Check browser storage, then click Load fixed trial sources again.','기존 초안을 백업하지 못해 교체하지 않았습니다. 브라우저 저장 공간을 확인한 뒤 Load fixed trial sources를 다시 누르세요.'],
  DRAFT_WRITE_FAILED:['The new draft could not be saved. The previous draft was kept. Check browser storage, then try again.','새 초안 저장 실패. 기존 초안을 보존했습니다. 브라우저 저장 공간을 확인한 뒤 다시 누르세요.'],
  DRAFT_RESTORE_UNCERTAIN:['Draft storage could not be verified. Do not retry or confirm a record. Your backup is retained locally.','초안 저장 상태를 확인하지 못했습니다. 재시도·기록 확인 저장을 멈추세요. 로컬 백업은 보존했습니다.'],
  TRIAL_SOURCE_INVALID:['The fixed documents failed validation. Your draft was kept. Reload this page, then click Load fixed trial sources again.','고정 자료 검증 실패. 기존 초안을 보존했습니다. 화면을 새로고침한 뒤 Load fixed trial sources를 다시 누르세요.'],
  TRIAL_HASH_MISMATCH:['The fixed request hash does not match. Your draft was kept. Stop and report this error.','고정 요청 해시 불일치. 기존 초안을 보존했습니다. 중단하고 이 오류를 알려주세요.'],
  TRIAL_TIMEOUT:['Loading timed out. Your draft was kept. Click Load fixed trial sources to retry manually.','자료 불러오기 시간 초과. 기존 초안을 보존했습니다. Load fixed trial sources를 눌러 직접 재시도하세요.']
 };
 let text='';
 if(s.status==='confirmation')text=t('A draft already exists. Replace it with the fixed documents? Your previous draft will be backed up locally; confirmed records will not change.','기존 초안이 있습니다. 고정 자료로 교체할까요? 기존 초안은 로컬에 백업하며 확인 저장된 기록은 변경하지 않습니다.');
 if(s.status==='loading')text=t('Loading fixed documents… No analysis or record saving. Please wait.','고정 자료 불러오는 중… 분석·기록 저장 없음. 잠시 기다리세요.');
 if(s.status==='cancelled')text=t('Kept your existing draft. No documents loaded, analyzed or saved.','기존 초안을 유지했습니다. 자료 불러오기·분석·기록 저장 없음.');
 if(s.status==='success')text=t('Loaded '+s.count+' documents: '+s.ids.join(', ')+'. Showing DOC1 below. Not analyzed or saved. Next: Review with offline provider.','문서 '+s.count+'개를 불러왔습니다: '+s.ids.join(', ')+'. 아래에 DOC1을 표시합니다. 분석·기록 저장 전입니다. 다음: 제공자 대역으로 검토.')+(s.backupKey?t(' Previous draft backed up locally.',' 기존 초안은 로컬에 백업했습니다.'):'');
 if(s.status==='error')text=t(...(errors[s.code]??['Could not load fixed documents. Your draft was kept. Check that this is the 4201 server, then click Load fixed trial sources to retry manually.','고정 자료를 불러오지 못해 기존 초안을 유지했습니다. 4201 서버인지 확인한 뒤 Load fixed trial sources를 눌러 직접 재시도하세요.']))+' ('+s.code+')';
 $('trial-load-status').textContent=text;
 if(s.status==='error')message(text,true);
}
const trialLoader=createFixedTrialLoader({
 isBlocked:()=>busy,
 capture:()=>({actor,revision,draft:currentDraft(),storedRaw:localStorage.getItem(DRAFT+actor)}),
 hasDraft:(s:any)=>Boolean(s.draft.text.trim()||s.draft.batch?.length||Object.keys(s.draft.answers).length||s.draft.decision||s.draft.receiptId||s.storedRaw!==null),
 show:renderTrialLoadState,
 setLoading:(loading:boolean)=>{
  busy=loading;
  for(const element of document.querySelectorAll('main input,main textarea,main select,main button')){
   const e=element as HTMLInputElement;
   if(loading){e.dataset.trialWasDisabled=String(e.disabled);e.disabled=true;}
   else if(e.dataset.trialWasDisabled!==undefined){e.disabled=e.dataset.trialWasDisabled==='true';delete e.dataset.trialWasDisabled;}
  }
  $('source-section').setAttribute('aria-busy',String(loading));
  if(!loading)$('confirm').disabled=!plan?.canConfirm||!$('checked').checked;
 },
 fetchTrial:async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch('/api/document/trial',{method:'GET',credentials:'same-origin',signal:controller.signal,cache:'no-store'});
   if(!response.ok)throw Error('TRIAL_HTTP_'+response.status);
   try{return await response.json();}catch{throw Error('TRIAL_SOURCE_INVALID');}
  }catch(e:any){if(controller.signal.aborted)throw Error('TRIAL_TIMEOUT');throw e;}finally{clearTimeout(timer);}
 },
 validateTrial:async(info:any)=>{
  if(!Array.isArray(info?.documents)||info.documents.length!==2||info.documents[0]?.kind!=='load'||info.documents[1]?.kind!=='payment'||info.documents.some((d:any)=>d.syntheticOnly!==true||typeof d.text!=='string'||!d.text.trim()))throw Error('TRIAL_SOURCE_INVALID');
  const prepared=await requestFor(info.documents);
  if(info.requestSha256!==fixedRequestPin||prepared.requestSha256!==info.requestSha256)throw Error('TRIAL_HASH_MISMATCH');
  return {documents:structuredClone(info.documents),ids:prepared.sources.map((s:any)=>s.id)};
 },
 backupDraft:(snapshot:any)=>backupTrialDraft(localStorage,storagePrefix+'document-confirm-002:trial-backup:'+actor+':'+Date.now()+':'+crypto.randomUUID(),{schema:'vulture-trial-draft-backup-v1',createdAt:new Date().toISOString(),...snapshot}),
 applyTrial:(checked:any)=>{
  const next=checked.documents,first=next[0];
  replaceTrialDraft(localStorage,DRAFT+actor,{kind:first.kind,text:first.text,synthetic:true,answers:{},decision:'',receiptId:null,batch:next,batchIndex:0});
  batch=next;batchIndex=0;providerCache=null;$('kind').value=first.kind;$('source').value=first.text;$('synthetic').checked=true;
  invalidate(false);updateBatchControl();$('source').setAttribute('aria-describedby','trial-load-status');
 },
 focusSource:()=>{$('source-section').scrollIntoView({block:'start',behavior:'auto'});$('source').focus({preventScroll:true});}
});
$('trial-load').addEventListener('click',()=>withUIActivity(storagePrefix,()=>trialLoader.load()).catch((e:any)=>mobileFeedback(e.message,true)));
$('trial-replace').addEventListener('click',()=>withUIActivity(storagePrefix,()=>trialLoader.confirmReplacement()).catch((e:any)=>mobileFeedback(e.message,true)));
$('trial-keep').addEventListener('click',()=>trialLoader.cancel());
$('trial-index').addEventListener('change',()=>{if(!batch)return;batch[batchIndex]=doc();batchIndex=Number($('trial-index').value);const d=batch[batchIndex];$('kind').value=d.kind;$('source').value=d.text;$('synthetic').checked=d.syntheticOnly;invalidate();if(providerCache&&sig(providerCache.documents)===sig(documents()))applyProviderResult({...providerCache,displayMode:'saved-response-replay'},documents(),revision);});
const scopeLabel=$('profile-scope');scopeLabel.dataset.en=trialChannel==='real'?'phrase-006 · ISOLATED REAL TRIAL · new calls blocked until separately approved':'phrase-006 · OFFLINE PROVIDER AREA · no real calls';scopeLabel.dataset.ko=trialChannel==='real'?'phrase-006 · 분리된 실모델 시험 · 별도 승인 전 새 호출 차단':'phrase-006 · 제공자 대역 영역 · 실제 호출 없음';localStorage.setItem(storagePrefix+'recovery-selected-actor',JSON.stringify(actor==='synthetic-driver'?'driver':'admin'));localize();restore();refreshProviderStatus();

async function review(...args:any[]){try{const result=await withUIActivity(storagePrefix,()=>reviewCore(...args));if(plan&&interpreted)mobileResponseBlocked=false;return result;}catch(e:any){mobileFeedback(t("Action blocked; records were kept: ","작업 차단; 기록 유지: ")+e.message,true);}}

async function confirm(...args:any[]){if(mobileResponseBlocked){mobileFeedback(t("A valid review or explicit replay is required before saving.","저장 전 유효한 검토 또는 명시적 재생이 필요합니다."),true);return;}try{const result=await withUIActivity(storagePrefix,()=>confirmCore(...args));return result;}catch(e:any){mobileFeedback(t("Action blocked; records were kept: ","작업 차단; 기록 유지: ")+e.message,true);}}

installPwaTools({
 prefix:storagePrefix,
 getLanguage:()=>lang,
 getState:()=>({busy:busy||trialLoader.isLoading(),unconfirmed:!!doc().text.trim()&&!receipt&&!plan?.sourceAlreadyConfirmed}),
 capture:()=>sig(currentDraft()),
 persist:()=>{replaceTrialDraft(localStorage,DRAFT+actor,currentDraft());readSynthetic(actor);}
});

function executionAnalysisCopy(a:any){const p=a.executionProvenance;return p?(p.replay?'SAVED REPLAY · ':'NEW RESPONSE · ')+p.kind+' | Model candidate checks: '+a.candidateDocumentPass+' | Whole-model checks: '+p.modelWholeResponsePass+' | Human confirmation still required.':'No execution provenance';}
function executionCompletionCopy(p:any){return p?p.completion+' | '+p.kind+(p.replay?' / saved replay':'')+' | Actual provider response: '+p.actualProviderResponse+' | Model whole-response checks: '+p.modelWholeResponsePass+' | Original candidate checks: '+p.candidateDocumentPass+' | Question omissions preserved: '+p.missingModelQuestions.length:'No execution receipt';}
