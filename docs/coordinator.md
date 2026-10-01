# Local coordinator checkpoint

The integration reuses the pinned action bridge to run Windows Hermes. Each planning delegation uses a separate Node worker, one Hermes turn, no caller context files and a bounded output buffer. The action bridge supplies execution-policy prompts and child-process timeout handling. This is a planning interface; prompt policy is not an OS sandbox and does not guarantee arbitrary model tool use is impossible.

## Implemented behavior

- Task state survives process restart in `.local/coordinator/tasks.json`. A store-wide exclusive file lock serializes transitions across processes. Task status plus a per-worker capability prevents duplicate starts and unauthorized completion.
- ChatGPT forward tasks acquire server-owned `origin: chatgpt` and `hops: 1`. Hermes escalation checks the persisted parent and its capability; caller arguments cannot reset provenance or hops. ChatGPT-origin recursion is always denied.
- Trusted native Hermes roots can request review, increment hops, and wait for a response. `max_hops` bounds successive reviews. Unknown, finished and expired task contexts fail closed.
- Only a configured session consumer can claim reviews. A claim capability is required to complete them. One review may be claimed globally; stale claims fail their parent and are never automatically replayed. Lease expiration is checked on the next operation, not by a background scheduler.
- `events.jsonl` records event type, IDs, timestamps and selected task metadata. It excludes prompts, answers and capabilities. The task store necessarily retains those for delivery and restart recovery. Both files are ignored by Git. Windows file access follows inherited ACLs; POSIX `0600` is not a Windows ACL guarantee. Use a private user workspace.
- A corrupt store or orphan lock blocks work. Locks are not stolen using a PID or elapsed-time guess. Recovery must first confirm that no coordinator is writing. Full doctor/recovery tooling follows in module 6. Do not put the state directory on network/cloud-synced storage.

## Local MCP roles

Build the action component before using the stdio launcher. It reuses the SDK from that component's pinned npm dependency lock rather than installing another unpinned copy.

| Trusted launch role | Entry | Tools |
|---|---|---|
| Forward client | `node scripts/mcp.mjs chatgpt` | `hermes_plan` |
| Task-bound Hermes worker | `node scripts/mcp.mjs hermes` | `request_chatgpt_review`, `read_chatgpt_review` |
| Dedicated consumer | `node scripts/mcp.mjs session` | `claim_hermes_review`, `complete_hermes_review` |

Roles are chosen by the launcher; there is no tool for changing roles or creating native Hermes roots. The Hermes role requires inherited `BRIDGE_PARENT_TASK_ID` and `BRIDGE_CONTEXT_TOKEN`. Those capabilities are injected into each worker's isolated environment and must never be placed in versioned config or logs. A native-root creation API exists for the future trusted launcher. Native Hermes MCP registration and asynchronous resume are not installed yet.

The MCP launcher reads the repository's ignored `config/bridge.local.json`, falling back to the example. It anchors state under the repository's `.local` regardless of client working directory. Forward planning works with escalation disabled. The other roles require explicit `escalation.enabled: true`; the consumer also requires `bound_session_id`. No environment file is automatically loaded yet. Full schema validation and configuration generation are module 6.

`bound_session_id` is a launcher binding, not evidence that a tool caller is a particular ChatGPT conversation. A real transport must verify the authenticated consumer and its session before configuring it. A session label or model prompt alone cannot provide that verification. Do not expose this stdio service as a shared unauthenticated network service.

## Dedicated conversation and current application

The intended project/conversation remains `Hermes Agent` / `Hermes Escalation`. A future consumer should receive one claimed request, keep its claim capability private, answer through `complete_hermes_review`, and avoid delegating that review back to Hermes. This checkpoint supplies the contract, not an automatically created or connected conversation.

No GUI driver is used by the coordinator. Ordinary ChatGPT still needs a verified supported MCP connection, and unattended delivery needs a supported consumer/wakeup mechanism. MCP events are a separate future implementation; this stdio SDK endpoint does not implement events or claim that the current local conversation can subscribe to them. Existing unmediated upstream tools do not inherit these coordinator protections.

## Validation

`npm test` covers provenance, capabilities, hop bounds, binding, lease expiry/replay, restart recovery, corrupt/orphan state, payload-free logs, role argument validation, real stdio initialize/tools-list and forbidden tool calls. Two contention tests each launch six separate Node processes.

`npm run probe:coordinator` performs a real Windows Hermes planning delegation and checks a known reply marker. It prints metadata only. Prompt and reply remain in the ignored probe task store. This uses the existing inference provider; it performs no desktop interaction and is not an end-to-end ChatGPT consumer test.
