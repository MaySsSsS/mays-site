---
phase: 7
slug: style-prompt-index
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-06
---

# Phase 7 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

This phase was backfilled after implementation, so the original plan files do
not contain a dedicated `<threat_model>` block. The register below is inferred
from the shipped `Style Prompt Index` implementation and verified against the
current code.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Static catalog data -> browser UI | Local JSON prompt data is fetched by the client page and rendered in React controls | Public prompt text, labels, source URLs |
| Fallback preview iframe -> upstream demo assets | Only when a local preview PNG fails, a sandboxed iframe may render sanitized demo HTML/CSS/allowed scripts | Public demo markup, public asset URLs |
| Browser UI -> OS clipboard | User-triggered copy action writes the visible prompt text to the clipboard | Public prompt text selected by the user |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-07-01 | EoP / XSS | Fallback preview iframe | mitigate | Demo HTML is sanitized before rendering; only allowlisted stylesheet/script sources survive; `srcDoc` is wrapped in a CSP with `default-src 'none'`, `connect-src 'none'`, `frame-src 'none'`, and the iframe uses `sandbox="allow-scripts"` plus `referrerPolicy="no-referrer"` | closed |
| T-07-02 | Tampering | Prompt catalog rendering | mitigate | Prompt text is rendered through React text nodes / `textarea value`, not `dangerouslySetInnerHTML`; selected template state is validated against the active filtered family list before use | closed |
| T-07-03 | Information Disclosure | Upstream demo/source outbound requests | accept | Primary previews are local static PNGs; fallback iframe strips referrer and blocks active network APIs, but external images/styles/fonts referenced by upstream demo content may still be requested if fallback rendering activates | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-07-01 | T-07-03 | If a local preview image is missing and iframe fallback activates, the demo may request third-party static assets. This is acceptable for the current public, unauthenticated tool because no user secrets or same-origin page context cross into the sandbox, and referrer data is suppressed. | Mays | 2026-05-06 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-06 | 3 | 3 | 0 | Codex (`$gsd-secure-phase 7`) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-06
