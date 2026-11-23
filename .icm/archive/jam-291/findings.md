# Findings jam-291

- review-shots took no usable picture. The preview is behind Vercel Deployment Protection. `prod.agorasim.pt` returns 404 `DEPLOYMENT_NOT_FOUND`, but `.icm/environments.md` lists it as production. Same as JAM-486.
- review-shots could not remove its 8 failed pictures in `~/baxter_live/workspace/scratch/shots/` (agorasim-2oesjv32v-* and prod.agorasim.pt-*, 2026-11-23 12:26-12:27). A hook blocks `rm` there. Blueprint fault: `agents/review-shots/CONTEXT.md` step 6 conflicts with the hook.
- JAM-292 (the "Lembrar" button) builds on this run: a checkout hold is now 15 minutes, its Stripe session 30 minutes.
