# Vulture phrase-006 — final source candidate

Contract phrase-candidates/0.6, fixed request and completed 006 business tests remain unchanged. Selected own code is MIT licensed: Copyright (c) 2026 박동혁 (Vulture). Third-party notices remain. This local package has NOT been pushed, published, deployed or activated for paid inference.

## Source-only installation
Node.js 24.x. Extract to a short folder on Windows. Do not copy an old dist or node_modules.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run verify:package
npm run build
```

esbuild 0.27.7 is a build dependency only, with its original license in legal/esbuild-LICENSE.txt. Runtime code uses local modules and Node built-ins. SOURCE-MANIFEST.json pins every selected input except itself. The build pins the unchanged request and browser business modules; app.ts changes only reviewer call availability/connection/status. SOURCE-ORIGINS.json retains historical provenance and identifies the current connection revision. No private approvals, keys, journals, databases or old spent locks are shipped.

## Deployment (requires separate approval)
The proposed target is one paid Render web instance, Oregon, Hobby workspace, 0.5 CPU/512 MB, 1 GB persistent disk at /var/data. render.yaml starts maintenance only and disables automatic deploys and new inference. It does not authorize account creation, payment or deployment.

After deployment approval: issue HTTPS; set exact VULTURE_PUBLIC_ORIGIN and a strong server-only VULTURE_ACCESS_SECRET; initialize the empty disk with node dist/provision.mjs --initialize-offline; switch startCommand to node dist/server.mjs. State is /var/data/vulture/phrase-006 and is never auto-reset. The root login is for the owner and reviewers only. Keep VULTURE_ENABLE_LIVE=off and omit the model key until separate aggregate activation approval. A shared reviewer passphrase expires into 8-hour signed HttpOnly/SameSite sessions; reviewers may log in again throughout the judging period. There is no per-person 4-hour approval window.

## New live execution versus replay
In /inbox?channel=real, load the two fixed synthetic sources. The existing live button, **Run approved reviewer analysis once**, invokes the frozen request only when a NEW parent service approval and quota are active. It sends one request for both documents; it does not use the historical 006 approval. Server-only NEBIUS_API_KEY is never accepted from a page or returned to the browser. Results retain valid candidates, invalid/unconfirmed items, model question omissions and code-generated questions. Human completion does not turn a model failure into PASS.

The existing dist/real/control.mjs single-use controller is reused unchanged in a new immutable per-attempt capsule, after reserving the parent global quota. Each capsule binds the exact source/request/build, delegated parent authorization and its own state/spent/dispatch locks. The parent's persisted authorization covers the whole judging period; short internal child dispatch authorizations are automatic implementation details, not a reviewer appointment or a fresh human approval. The old trial locks are neither copied nor rearmed.

**Replay saved provider response — no new call** loads a preserved actual response. **Review with offline provider** is a fixture. Simulation is labeled simulated transport, never real model success. All run through the existing questions → checked preview → explicit save → report UI. Equal amounts alone never identify duplicate transactions. Reports contain only confirmed local browser records, not a shared server business database.

## Aggregate period control
UTC 2026-12-01 17:00 through 2026-12-15 20:00 (KST December 2 02:00 through December 16 05:00). Maximum 100 attempts TOTAL across all reviewers, actors, sessions and restarts. Concurrency one. 8,000 input / 2,048 output tokens, 45 seconds, one POST per attempt, no retry/fallback/top-up. Each reservation permanently consumes one slot and $0.0042432 of estimated allowance, even on setup failure, HTTP failure, timeout or uncertain delivery. Total estimated allowance $0.42432; not a provider billing hard cap. Actual usage/raw responses and child spent locks are separately retained. Missing/corrupt state fails closed rather than recreating quota.

Activation must use a NEW reviewer-approval.USER.json on the disk, never an old trial approval. It must match REVIEWER_POLICY, exact publicOrigin/stateRoot and the SHA-256 of dist/SERVICE-RELEASE.json. Write approved:true, simulation:false, approvedAt and explicit userApprovalText ONLY after activation authorization. Run node tools/provision-separately-approved.mjs --provision-approved-reviewer-period (no POST). This snapshots the approved source/build onto the disk and creates reviewer-provisioned.lock plus reviewer-service. Then set VULTURE_ENABLE_LIVE=reviewer-period-approved and the dedicated server key; restart. No production authorization is supplied in this package. Recheck official model price/status before activation; a price increase or release/source change requires review/rebinding, never reuse the old approval.

At exhaustion/period end: new inference stops, while login, saved replay, drafts, explicit human saves and reports remain available. No automatic key rearm or quota reset. Setting live off still permits saved reviewer-response access without a key.

## Evidence and remaining checks
Historical actual 006: REVIEWABLE_DRAFT_NOT_MODEL_PASS; user completion/report and refresh were already verified on notebook. This work tests only the new aggregate/HTTPS-entry connection with a fake key and local transport. It does not claim new model PASS, real TLS, Linux/Render disk behavior, Galaxy installation or a record-preserving version update. See JUDGE-GUIDE.md.

Before changing origin, export local business records/drafts using the existing local backup controls. Keep the same account/channel scope; copy response text separately if needed. Confirm the import on HTTPS before removing the old browser data. Origins do not share localStorage. Disk backup is a separate task and never substitutes for a browser backup.

After separately approved deployment: HTTPS → Galaxy Chrome login → inbox → Add to Home screen/Install app → icon launch. Existing update controls do not reload automatically while input/save is active. Actual Galaxy installation and a real upgrade retaining records remain unverified. No current APK is supplied.

Proposed shutdown December 16 06:00 KST: disable live and remove/revoke the dedicated provider key; export browser records and download an encrypted private disk backup including all consumed ledgers/locks; confirm backups; delete the Render service AND disk, verify billing termination, revoke GitHub integration if unnecessary. Never reset/recycle the original or reviewer approval. Repository publicity remains a separate decision; deleting hosting does not unpublish GitHub.

