# Stub: The tour terms on a tour quote do not promise a cancel link that a quote does not have

- lane: tweak
- found-by: PR payment-link-from-scratch, build · 2026-10-28
- complexity: research
- priority: P2

## Problem

A tour quote shows and emails the tour's terms sections "Cancelamento e reembolso" and "Mau tempo"
from `web/src/content/terms.ts`. The cancellation section says the confirmation email holds a link
to cancel the booking. A tour quote has no such link. The customer cancels by email or phone only.

## Proposed change

Investigate. Ask Jamie and the client which cancellation rule a tour quote follows. Then either add
a sentence for quotes to the terms (a new terms version) or give a tour quote a cancel link.

## Acceptance criteria

- [ ] The terms a tour quote shows describe how its customer cancels, in PT and EN.
- [ ] `TERMS_VERSION` moves if the terms text changes.
