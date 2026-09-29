---
'@mzwing/pi-permission-auto-review': patch
---

Pass the session ID on reviewer model calls, so gateways that require one (opencode-go rejects requests without `x-opencode-session` with `400 MissingSessionID`) can serve as the review model.
