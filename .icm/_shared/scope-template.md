# Settled scope — the definition (Layer 3 reference)

The **single home for the shape of a settled scope**. `.icm/stages/01_scope/CONTEXT.md` owns _how_
a source is recorded, interrogated and cut; this file owns _what the settled document looks like_.

The shape is deliberately thin: **the source as it arrived, plus a short addendum saying what was
settled on top of it.** The source is theirs; the addendum is ours.

## The two rules everything else serves

**1. Simplicity.** Plain language, short sentences, the bigger picture rather than the detail —
Define goes into detail later. Technical facts are stated when they matter to what is being
decided; nothing is said in jargon that could be said plainly. A surface is named by what a person
must be able to decide or do there, never by the control they click. See
`stages/01_scope/CONTEXT.md` → "The one writing rule".

**2. The source is reproduced, never rewritten.** `scope.md` carries `_source/story.md` as
recorded — text verbatim, anything else by link plus description. Everything that changes it — a
different threshold, a narrower persona, a rule struck — is stated in the addendum as a decision,
naming the line it overrides. That separation is the whole design: a reader can see what was asked
for and what we agreed on top, without having to trust that the two were merged faithfully.

## The template

Populate this exactly.

```md
# Scope: <slug>

- story: 01_scope/\_source/story.md — the source as received, never edited
- author/source: <the author | call with … | prototype | …>
- personas: <from the repo's persona vocabulary — `personas` in .icm/project.json>
- agreed: <YYYY-MM-DD — the day Scope settled it in session>
- stubs: <n> (.icm/intake/<slug>/)
- canonical: this file, until Define writes spec.md

---

## The story

<`_source/story.md` reproduced as recorded — the provenance header, then the text exactly as it
arrived (or the link plus description for a non-text source). Not tidied, not restructured,
nothing dropped.>

---

## Assumptions

<Everything the scope relies on that the source didn't say, stated plainly, one line each. An
assumption the operator confirmed carries its `D-n`; one that wasn't put to them stands on its own
and is safe enough to state without asking.>

- <assumption> <optional `[D-3]`>

## Decisions

<The audit trail: what was settled in session, on top of the source. Ids are stable — `D-n` is the
trace from this table to the stub's `Notes for Define` to the spec, so a decision is never
renumbered.>

| ID  | Decision          | Why / context | Changes                                        |
| --- | ----------------- | ------------- | ---------------------------------------------- |
| D-1 | <what was agreed> | <one line>    | <the source line it overrides, or "no change"> |

## Out of scope

- <what this scope deliberately does not cover this round — plainly stated>

## Open for Define

<Everything the operator could not settle in session. Each line is a question Define must answer
before the spec is approvable — copied into the relevant stub's `Notes for Define`. "None" if
nothing is open.>

- <the open point, and which stub it lands in>
```

## Writing rules

- **The source is the body; the addendum is the agreement.** If you find yourself editing the
  source to make it read better, stop — that belongs in the addendum as a decision.
- **One row, one thought.** An addendum line containing "and" that could be two lines, is two.
- **`D-n` ids are permanent.** `D-4` means `D-4` for the life of the scope — in `scope.md`, in the
  intake stubs, in `spec.md`, in the PR. Never renumber to close a gap.
- **State numbers, not adjectives.** "Within 14 days" not "promptly". "Top 10" not "the main ones".
  Every number in the addendum is either something the source said or a default the operator let
  stand.
- **Open means open.** A point nobody could settle goes under `## Open for Define` — never
  resolved by assumption, never dropped. It is a question with an owner (Define), not a gap.
- **Out of scope earns its place.** It prevents more rework than anything else in the document;
  never leave it empty because nothing came up. If genuinely nothing is excluded, say so in one
  line and why.

## No length ceiling — but a splitting signal

There is no word budget: the source is however long it arrived. What still holds is the
**splitting signal**: a scope whose addendum needs a dozen assumptions and twenty decisions across
three unrelated personas is not one scope, it is two or three that haven't been separated yet.
That shows up at the cut, which is where a scope becomes many stubs; a scope that cuts into nine
stubs was never one scope. Flag it in `breakdown.md` rather than compressing the rules to make it
look smaller.

## Spikes and investigations

The shape bends, deliberately: the source is the question being investigated, `## Assumptions`
carries the findings, and `## Decisions` carries the decision the operator had to make rather than
clarifications. `## Out of scope` still applies — an investigation has a boundary like anything
else.

## Verify

- The header is present and complete: story, author/source, personas, agreed, stubs, canonical.
- **`## The story` is `_source/story.md` as recorded.** Diff them; any difference is a bug.
- All four addendum sections present, in order — a section that genuinely doesn't apply carries
  its one-line reason ("None").
- Every decision has an id, a one-line why, and what it changed (or "no change").
- Nothing unsettled is anywhere but `## Open for Define`: no "to be confirmed", no bracketed
  placeholder elsewhere in the document.
- Plain language throughout: short sentences, technical facts only where they matter, no jargon
  for its own sake, no effort or feasibility talk.
