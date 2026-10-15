# OS HTTP contract browser check — synthetic, not real IMAP

The dedicated GitHub Actions workflow `OS HTTP Contract Browser` opens the
actual Next.js `/os` interface and intercepts CORE HTTP calls with explicit
synthetic fixtures. No credentials or customer data are used.

Coverage:
- a CORE-verified connected mailbox is rendered in Post with explicit company ID;
- a disconnected mailbox is never read and navigates to Settings → Quellen;
- malformed success responses cannot be interpreted as an empty mailbox.

This does **not** run a real CORE, IMAP source or MÔRA intelligence runtime.
It does **not** prove the selected-company scope of `GET /v3/connections`
(CORE issue #100).

The genuine local IMAP route is still described by `e2e/os-live-mail.spec.ts`
and OS issue #107. It requires an isolated disposable local CORE account, a
dev-only IMAP server, actual runtime credentials and destructive test-reset
operations. It must not be run on production or against a customer mailbox.

No green synthetic browser check alone authorizes merging into main, live
connector claims or deployment.
