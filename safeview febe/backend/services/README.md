# Services

- `detectionService.js` — orchestrates persistence + detection + broadcast for every packet.
- `ruleEngine.js` — the rule-based detector.

Higher-level business logic that spans multiple tables belongs here so
controllers stay thin.
