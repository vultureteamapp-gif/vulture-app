# Whole-period reviewer activation — pending explicit approval

Implementation is prepared and locally tested with a fake key and no external requests. This is NOT an activation approval. Existing paid trial approvals are consumed and may not be reused.

- Official judging window: KST 2026-12-02 02:00 through 2026-12-16 05:00. Access is available throughout the window, with re-login when an 8-hour session expires.
- One shared maximum of 100 actual request attempts for everyone, not per reviewer. Each processes only the unchanged synthetic DOC1 + DOC2 and phrase-006 evidence. No arbitrary-input expansion.
- Nemotron 3 Super, model nvidia/nemotron-3-super-120b-a12b. Input <=8,000, output <=2,048, timeout 45s, one POST per reservation, no retry/fallback/automatic budget increase.
- Reserve $0.0042432 before dispatch, permanent full reserve even on failure/unknown outcome. At most $0.42432 estimated total. Provider billing is not hard-capped by this estimate. Check official price before activation; current planning prices $0.30/M input, $0.90/M output.
- New aggregate approval binds dist/SERVICE-RELEASE.json SHA, request, limits, period, public HTTPS origin and /var/data/vulture/phrase-006. New persistent parent ledger and isolated immutable single-use child execution/spent paths. No old approval or lock is reused.
- Concurrency one, persistent global reservations, exclusive owner, consume-before-POST child lock. Crash/timeout cannot reclaim a slot; a missing or corrupt state is blocked, not reset. There is no automatic top-up. Single-instance deployment only; changing release/origin requires a reviewed migration, not a fresh 100 quota on the same period.
- When depleted, before the window or after its end, inference is disabled. Login, saved replay, human correction, local save and report remain. Key may be removed while serving saved responses.

Reviewer steps for fresh execution: login → Load fixed trial sources → expand AI scope, saved replay and validation details → Run approved reviewer analysis once → inspect current candidates/questions → answer only checked gaps → preview → explicit confirmation/save → report. Playback uses the separate Replay saved provider response — no new call button and does not consume a model request. Original whole-model failure/omissions remain diagnostic facts after human completion.

Actual activation, key entry, provider calls, Render payment/deployment, GitHub push/publication and final contest submission each still need the relevant authorization. The earlier $25 was a proposed budget only. The application does not assert that replay alone meets the organizer's live-inference requirement.

