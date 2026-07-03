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

- **Schema:** `src/db/schema.ts` — inbound `tour_requests` plus one draft table
  per generated-content pipeline (`geo_content_drafts`, `blog_post_drafts`,
  `social_post_drafts`, `email_campaign_drafts`).
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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
