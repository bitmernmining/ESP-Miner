# Bitmern OS — security_audit_log

## 2026-09-09 — Pool bake-in (address-class)

| Field | Value |
|-------|--------|
| **Decision** | APPROVED |
| **Approver** | Giannis Andreou (written chat direction) |
| **Executor** | Brandon CTO |
| **Primary pool** | `btc.bitmernsolo.com:3132` |
| **Fallback pool** | `btc.bitmernsolo.com:3122` |
| **Scope authorized** | Bake into firmware defaults → build factory images for boards **401 / 601 / 603** → flash **test units only** (1–2 per board) → run full acceptance checklist |
| **Explicitly NOT authorized** | Batch flashing; shop inventory; putting Bitmern Edition live in shop; Telegram/X / auto-poster; QR wallet scan; Phase 1 config pack edits |
| **Lock-in** | None — Advanced / pool settings must remain user-changeable; reflash to stock must remain possible |
| **Next gate** | Separate Giannis approval after clean acceptance on real units (first batch / shop) |
| **Source** | Phase 2 Developer Guide STEP 3 + Giannis chat 2026-09-09 ~15:11 Asia/Dubai |

