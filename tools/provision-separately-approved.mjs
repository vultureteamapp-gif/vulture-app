// Explicit aggregate initialization only; no approval/key generation, no external call.
import path from 'node:path';import {provisionApprovedTrial} from '../dist/state-api.mjs';
if(process.argv[2]!=='--provision-approved-reviewer-period')throw Error('EXPLICIT_REVIEWER_PERIOD_PROVISION_REQUIRED');
const stateRoot='/var/data/vulture/phrase-006';
console.log(provisionApprovedTrial(stateRoot,path.resolve(import.meta.dirname,'../dist/runtime-root')));
