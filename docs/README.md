# Documents

## Kickoff documents

Client-facing documents for the Agorasim project kickoff with Diogo & Rita.

| File | Purpose |
|------|---------|
| `How-We-Will-Work-Together.docx` | Plain-English walkthrough of the SDLC, the feature-by-feature milestone process, each side's responsibilities (engineer vs. product owners/testers), a testing/feedback guide, and a tech-jargon glossary. |
| `Commission-and-Payments-Agreement.docx` | Simple contract covering only the ongoing money: how the 4% (tours) and 6% (car hire/events) commissions are collected automatically via Stripe Connect application fees, payouts, refunds, safeguards, and signatures. The upfront build fee is intentionally not mentioned. |

Both are `.docx` so the wording can be adjusted before sending. They mirror the
visual identity of `proposals/proposal.html` (deep green, brass, parchment).

## Engineering notes

| File | Purpose |
|------|---------|
| `data-protection.md` | What the GDPR machinery in `web/` does, and the list of policy questions — the retention period above all — that a human still has to answer before the privacy policy can be published. |
| `cookies-and-third-parties.md` | Audit of every outbound request the public site makes — and why, with the FareHarbor embed gone, there is no cookie banner: nothing non-essential loads, so there is nothing to consent to. |
