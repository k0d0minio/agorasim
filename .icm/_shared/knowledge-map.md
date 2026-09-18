# Knowledge map — what each stage reads, and where (Layer 3 reference, project-owned)

The router every stage loads to find its slice of this repo's knowledge. Project knowledge — what
the product is, who it serves, how it is built — is canonical in the docs tree named by
`docs_path` in `.icm/project.json` (or, for a repo without one, in `README.md` and the `AGENTS.md`
files); the pipeline never copies it into a contract, it reads it from here on demand. This file is
project-owned: it names this repo's pages, and the sync never touches it. Validate it with
`.icm/scripts/validate-knowledge-map.sh` whenever a page moves.

Paths below are relative to `docs_path`. A page named here must exist; a page that does not exist
here is not part of any stage's context budget.

## Where the knowledge lives

- <section> — `<path>`: <what a stage finds there>

## What each stage reads

| Stage | Reads | Writes |
| --- | --- | --- |
| **Scope** (incl. the cut) | may read everything, to check requirements are clear, nothing breaks, and the feature fits what exists; prefers <the pages that carry vocabulary and direction> | — (its artifacts are `.icm/runs/<slug>/01_scope/**` + `.icm/intake/<slug>/`) |
| **Define** | <the pages a spec's `touches:` and personas come from> | — |
| **Build** | <architecture and package pages>; the code rules (`_shared/conventions.md` → the repo's file) | — |
| **Release** | the pages a shipped change makes stale | those pages (the docs skill), the changelog if the repo has one |
| **Knowledge lane** | exactly the one page the request names | that page; this map when a page is added or removed |
