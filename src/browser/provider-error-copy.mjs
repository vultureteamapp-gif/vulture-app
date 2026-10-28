const messages={
 MODEL_OUTPUT_TRUNCATED:['The model reached its output limit before completing the answer. Nothing was saved; no automatic retry.','모델이 출력 한도에 도달해 답변을 완료하지 못했습니다. 기록 저장·자동 재시도 없음.'],
 MODEL_CONTENT_MISSING:['The provider returned no final answer. Reasoning text is not used as the answer. Nothing was saved.','최종 답변이 없습니다. 추론 내용을 답변으로 대신 사용하지 않습니다. 기록 저장 없음.'],
 MODEL_JSON_INCOMPLETE:['The final JSON appears cut off and cannot be used. Nothing was saved; no automatic repair or retry.','최종 JSON이 중간에 끊긴 형태여서 사용할 수 없습니다. 기록 저장·자동 보정·재시도 없음.'],
 MODEL_INVALID_JSON:['The final answer is not valid JSON. Nothing was saved; no automatic repair or retry.','최종 답변이 올바른 JSON이 아닙니다. 기록 저장·자동 보정·재시도 없음.'],
 MODEL_EVIDENCE_INVALID:['A quoted value or source location does not match the original document. The result was rejected; nothing was saved.','값·인용·근거 위치가 원문과 일치하지 않아 결과를 거부했습니다. 기록 저장 없음.'],
 MODEL_DOCUMENT_MISMATCH:['The response document ID or source fingerprint does not match the input. Nothing was saved.','응답 문서 ID 또는 원문 식별값이 입력과 달라 거부했습니다. 기록 저장 없음.'],
 MODEL_QUESTION_UNSUPPORTED:['A question is not supported by the document evidence. Nothing was saved.','원문 근거가 뒷받침하지 않는 질문이 있어 거부했습니다. 기록 저장 없음.'],
 MODEL_QUESTION_EVIDENCE_INVALID:['A question cites missing or invalid evidence. Nothing was saved.','질문이 존재하지 않거나 잘못된 근거를 인용해 거부했습니다. 기록 저장 없음.'],
 MODEL_SCHEMA_INVALID:['The response does not follow the required document format. Nothing was saved.','응답이 필요한 문서 형식을 따르지 않아 거부했습니다. 기록 저장 없음.'],
 MODEL_REFUSED:['The model declined the request. Nothing was saved; no automatic retry.','모델이 요청에 답하지 않았습니다. 기록 저장·자동 재시도 없음.'],
 MODEL_COMPLETION_NOT_FINAL:['The provider did not return a completed final answer. Nothing was saved.','제공자가 완료된 최종 답변을 반환하지 않았습니다. 기록 저장 없음.']
};
export function providerErrorCopy(code,language='en'){
 const safe=typeof code==='string'&&/^[A-Z][A-Z0-9_]+$/.test(code)?code:'PROVIDER_RESPONSE_FAILED';
 const pair=messages[safe]??['The provider response failed validation. Nothing was saved; no automatic retry.','제공자 응답 검증에 실패했습니다. 기록 저장·자동 재시도 없음.'];
 return pair[language==='ko'?1:0]+' ('+safe+')';
}
