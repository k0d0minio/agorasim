# Setup — the request button

A client asks for a change from the app itself: the button opens a form, and the request
goes to the store of this repo with a capture of the page (`.icm/_system/features/requests.md`).

## The code: one import, one route (a session can do this part)
The root layout (`app/layout.tsx` or `src/app/layout.tsx`) gets one import and one element
in `<body>`. Use the relative path from the layout to `.icm/` (`../.icm` from `app/`,
`../../.icm` from `src/app/`):

```tsx
import { RequestButton } from "../../.icm/_system/request-button/RequestButton";
// in <body>, after {children}:
<RequestButton />
```

The form has the language of this repo: `language` of `.icm/project.json` (pt-PT).
Give `lang` (`en`, `fr` or `pt`) only for a site in a different language.

The route is one new file, `app/api/baxter-request/route.ts` (or below `src/`):

```ts
export { POST } from "../../../../.icm/_system/request-button/route";
```

No other code file changes. The prop `user` (`signedIn`, `role`, `id`) adds the user to the
capture when the layout knows the user. The id leaves the server only as a hash.

## A monorepo (a session can do this part)
In a monorepo (Turborepo, pnpm workspaces), the button goes in the app that the client
uses: one app of `apps/`, for example `apps/web`. Put it in a second app only when the
operator says so. `.icm/` stays at the root of the repo. `setup.sh` finds the layout and
the route below `apps/*/app/` and `apps/*/src/app/`, and a root layout in one segment
(`app/[locale]/layout.tsx`, `app/(site)/layout.tsx`).

The relative paths start in the folder of the file. Count one `../` for each folder up to
the root of the repo:

| File | Import path |
|---|---|
| `apps/<app>/app/layout.tsx` | `../../../.icm/_system/request-button/RequestButton` |
| `apps/<app>/app/[locale]/layout.tsx` | `../../../../.icm/_system/request-button/RequestButton` |
| `apps/<app>/src/app/layout.tsx` | `../../../../.icm/_system/request-button/RequestButton` |
| `apps/<app>/app/api/baxter-request/route.ts` | `../../../../../.icm/_system/request-button/route` |
| `apps/<app>/src/app/api/baxter-request/route.ts` | `../../../../../../.icm/_system/request-button/route` |

Two more changes at the root of the repo:

- [x] `react`, `@types/react` and `@types/node` are `devDependencies` of the root
      `package.json`, with the version of the app (`catalog:` when the workspace has a
      catalog). The files of `.icm/_system/request-button/` are outside the app, so they
      find `react` from the root. pnpm does not hoist the packages of an app to the root.
      With no `react` at the root, the type check and the build of the app fail.
- [ ] With Turborepo: the env values `BAXTER_REQUEST_*` of the section below are in
      `globalEnv` of `turbo.json` (or in `env` of the task `build`). In the strict env mode
      Turborepo hides each value that `turbo.json` does not name, and the button does not
      show after the build.

## The look: CSS variables (a session can do this part)
The button and its form read CSS variables of the app. Each one has a neutral fallback:
with no variable, the button is black and white. Set them in `:root` of the global style
sheet, with the tokens of the design system:

```css
:root {
  --baxter-accent: /* the button, the selected chip */;
  --baxter-accent-text: /* the text on the accent */;
  --baxter-surface: /* the panel */;
  --baxter-text: /* the text */;
  --baxter-muted: /* the notes */;
  --baxter-border: /* the fields and the chips */;
  --baxter-font: /* the text font */;
  --baxter-heading-font: /* the title font */;
  --baxter-radius: /* the panel corners */;
}
```

More variables, optional: `--baxter-chip`, `--baxter-chip-text`, `--baxter-control-radius`
(default capsule), `--baxter-field-radius`, `--baxter-heading-transform`,
`--baxter-heading-color`, `--baxter-overlay`, `--baxter-shadow`, `--baxter-launcher-shadow`,
`--baxter-focus`, `--baxter-status`. Set the two shadows to `none` for a design with no
shadow.

## The env values (the operator)
Set these in Vercel for the UAT environment. A local dev server shows the button with no
value.

- [ ] `BAXTER_REQUEST_ENV` = `uat` on UAT. Not set on production: the button does not show.
      Production only with `production` and `BAXTER_REQUEST_PRODUCTION` = `on`.
- [ ] `BAXTER_REQUEST_LINEAR_API_KEY`: a Linear API key of the client's workspace that can
      create issues and labels in the team `requests.linear_team` of `.icm/project.json`.
- Optional: `BAXTER_REQUEST_LINEAR_TEAM` (a team key), `BAXTER_REQUEST_LINEAR_PROJECT` (a
  project name, slug or id of that team, or `none`) and `BAXTER_REQUEST_LINEAR_LABELS`
  (label names, with commas). They replace `requests.linear_team`, `linear_project` and
  `linear_label` of `.icm/project.json` for this deployment. An unknown team or project
  stops the request with an error.

Each value is a secret of the deployment. Never put one in the code or in this repo.
