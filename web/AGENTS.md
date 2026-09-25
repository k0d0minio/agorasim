<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Committed images stay under the upload bar

The upload field in `/admin/experiences` rejects anything over `EXPERIENCE_IMAGE_MAX_BYTES`
(~5 MB, `web/src/lib/experience-images.ts`). A file committed straight to
`web/public/images/` skips that check, so keep every committed image under the same bar —
every CI checkout and Vercel build pulls the whole tree.
