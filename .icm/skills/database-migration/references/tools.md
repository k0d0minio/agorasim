# Migration tools — ordering, out-of-order, and where the setting lives

`check-migrations.sh` enforces the stamp on the SQL files `migrations.path` names and prints
one line for the declared `migrations.tool`. What each tool actually does with order:

| tool | orders by | a migration stamped before one already applied | the setting |
|---|---|---|---|
| **flyway** | the `V<version>__` prefix, parsed numerically | refused by default (`Detected resolved migration not applied to database`) | `flyway.outOfOrder=true` in `flyway.conf`, or `-outOfOrder=true` on the command line — `migrations.out_of_order: true` says the repo runs with it |
| **prisma** | the migration folder name, lexicographic | applied — `prisma migrate deploy` applies every pending migration in folder order and does not refuse an older stamp; what it refuses is a **checksum** change to an applied migration | none — never edit an applied migration; the `V…__` stamp rule applies to raw SQL folders, not to prisma's own `migrations/<timestamp>_<name>/migration.sql` |
| **drizzle** | `meta/_journal.json` (`idx`, `when`), not the file name | the journal is the order; two branches that both ran `drizzle-kit generate` conflict in the journal | none — resolve a journal conflict by regenerating on the merged tree (`drizzle-kit generate` after the merge), never by editing `idx` by hand |
| **sql** (a plain runner, `psql -f` in a loop, a custom script) | file name, lexicographic | whatever the runner does — most apply anything not yet recorded | the runner must record applied files by name and apply the rest, in name order; `migrations.out_of_order: true` is the statement that it does |

## The stamp, and why milliseconds

Two runs stamped in the same second sort by name, and name order is arbitrary. A UTC
millisecond stamp — 17 digits — makes the order the order they were written in, across
machines, without a counter anybody has to coordinate. `check-migrations.sh --new` reads the
clock once, after the newest stamp `main` and the branch already carry, so a stamp is never
behind one that exists.

The legacy second form (`20260922070000_add_tokens.sql`) is still read and ordered; a repo
keeps it by declaring `"stamp": "seconds"` in `.icm/project.json` → `migrations`. Mixed forms
in one folder are ordered by stamp value, not by file name — which is why the script sorts
them itself.
