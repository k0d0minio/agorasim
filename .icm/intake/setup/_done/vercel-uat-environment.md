> Done: Jamie, 2026-10-30. Checked via `vercel env ls` (`uat` is a live custom environment
> target) and `vercel domains inspect`: `uat.agorasim.pt` resolves on Vercel's edge network.
> `.icm/environments.md` already has the UAT row filled with the project name and address.

# Setup: the UAT environment on each Vercel project that the client tests

- setup-slug: vercel-uat-environment
- needs: uat
- where: Vercel → the project → Settings → Environments, and the domain registrar

## Why

Without the custom environment `uat`, no merge reaches the UAT address, and `promote.sh` finds
no UAT project. Without the second step, each merge moves production before the sign-off.

## Steps

Do these steps on each Vercel project of an app that the client tests:

1. Make sure that the team is on the Pro plan. A custom environment needs it.
2. Make sure that the project's git link is this repository.
3. Open Settings → Environments. Add a custom environment with the slug `uat`.
4. Set its branch tracking to `main`.
5. Attach the domain `uat.<the production domain>` to `uat`.
6. Add the CNAME record at the domain registrar.
7. Open Settings → Environments → Production. Set "Auto-assign Custom Production Domains" to
   off.
8. In `.icm/environments.md`, write the project's name in the column `Vercel project` of
   its UAT row, and the UAT address in the column `Address` of the same row.

## Done when

- [x] Each project that the client tests has the custom environment `uat`, from `main`.
- [x] The UAT address opens the newest build of `main`.
- [x] `.icm/environments.md` has one UAT row for each project that the client tests. Each
      row names the project in `Vercel project` and its UAT address in `Address`.
- [x] A merge to `main` makes a staged production deployment that serves no domain.
