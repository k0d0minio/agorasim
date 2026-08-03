This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Database (Neon Postgres + Drizzle)

The admin dashboard and the public onboarding form (`/[locale]/reservar`) are
backed by a [Neon](https://neon.tech) Postgres database via
[Drizzle ORM](https://orm.drizzle.team).

- **Schema:** `src/db/schema.ts` — inbound `tour_requests`, the operator tables
  (`admin_users`, `audit_log`), plus one draft table per generated-content
  pipeline (`geo_content_drafts`, `blog_post_drafts`, `social_post_drafts`,
  `email_campaign_drafts`).
- **Client:** `src/db/index.ts` — a lazily-initialized Drizzle client on Neon's
  serverless HTTP driver. Import `db` from server code only.
- **Migrations:** `drizzle/` — `0000_*` creates the schema, `0001_seed_mock_content`
  seeds representative bilingual drafts and sample leads.

Copy `.env.example` to `.env.local` and set `DATABASE_URL` (the Neon connection
string), then:

```bash
pnpm db:generate   # regenerate SQL after editing the schema
pnpm db:migrate    # apply pending migrations (schema + seed)
pnpm db:studio     # browse the database
```

In CI, the **DB migrate** GitHub workflow (`.github/workflows/db-migrate.yml`)
runs `pnpm db:migrate` on pushes to `main` using the `DATABASE_URL` repository
secret, keeping the database provisioned with the current schema and seed data.

## Admin accounts

`/admin` is behind per-user accounts, not a shared password — that is what lets
the audit log name who did what. Two roles: `owner` (Diogo & Rita: everything,
including team accounts and guest personal data) and `collaborator` (everything
operational, but no user management and no exporting or erasing guest data).

A fresh database has no accounts in it, so seed the first owner:

```bash
ADMIN_SEED_EMAIL=diogo@agorasim.pt \
ADMIN_SEED_NAME=Diogo \
ADMIN_SEED_PASSWORD='a long passphrase' \
pnpm db:seed-owner
```

It is idempotent — if that address already has an account it is left alone,
password included — so it is safe to run on every deploy, and the "DB migrate"
workflow does exactly that. Everyone else is added from **Settings → Team
accounts**, and changes their own password from **Settings → My account**.

This seed is the only route to a first account. The login form authenticates
against `admin_users` and nothing else, so a deployment with an empty table and
no seed secrets has to be seeded from a database console.

## Data protection

The site collects personal data through the tour-request form, so `web/` carries
the machinery for handling it: a privacy policy, consent capture, subject-access
export, erasure, a retention job, and a cookie banner that gates the FareHarbor
embed. Two things to read before touching any of it:

- `docs/data-protection.md` — what exists, and the policy questions (the
  retention period above all) that still need a human decision. The privacy
  policy in `src/content/privacy.ts` is a **draft** pending legal review.
- `docs/cookies-and-third-parties.md` — what the public site actually loads and
  why the banner works the way it does.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
