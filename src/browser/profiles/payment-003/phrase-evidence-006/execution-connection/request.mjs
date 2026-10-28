// Transport aliases only: frozen phrase-006 body and schema are unchanged.
import {requestPhrase006,validatePhraseReply,PROFILE,MODEL} from "./../contract.mjs";
export {PROFILE,MODEL};export const TRIAL='document-meaning-payment-006';
export const LIMITS=Object.freeze({inputUpperBound:8000,outputMaxTokens:2048,timeoutMs:45000,maxExternalPosts:1,automaticRetries:0,maximumEstimatedUsd:0.0042432});
export async function requestPayment003(documents){const p=await requestPhrase006(documents);if(p.inputEstimatedTokens>8000)throw Error('PHRASE_INPUT_UPPER_BOUND_EXCEEDED');return {...p,bodyText:p.serialized};}
export async function validatePayment003(reply,documents,source='offline-provider-fixture'){return (await validatePhraseReply(reply,documents,source)).analyses;}
export {requestPayment003 as requestEvidence006};
