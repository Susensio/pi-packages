---
"@mzwing/pi-codex-downgrade-detector": patch
"@mzwing/pi-model-info": patch
"@mzwing/pi-permission-auto-review": patch
---

chore: accept Pi 0.87 and @gotgenes/pi-permission-system v34 and v35, reconcile the bundled Guardian policy against openai/codex@26cb4d73

pi-model-info now keeps a model's `promptCache` and Pi 0.87's new `inputLimits` when it re-registers a provider's models, instead of dropping both.

`@gotgenes/pi-permission-system` v34 and v35 leave the authorizer surface unchanged: their breaking changes gate a redirect's target against path rules, which authorizers already cannot auto-approve, and stop appending the tool surface to a custom system prompt.

Upstream added an `{{ extra_policy }}` slot for operator policy at the end of the template's security policy (openai/codex#47125). pi-permission-auto-review's `additionalPolicy` now renders in that slot, as `## Operator Policy` ahead of the outcome rules instead of after them, so `POLICY_REVISION` moves to `+pi2`.
