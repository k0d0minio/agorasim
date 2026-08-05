import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { requireAdmin } from "@/lib/admin-auth";
import { recordAuditOrWarn } from "@/lib/audit";
import {
  EXPERIENCE_IMAGE_CONTENT_TYPES,
  EXPERIENCE_IMAGE_MAX_BYTES,
  EXPERIENCE_IMAGE_PATH_PREFIX,
} from "@/lib/experience-images";

/**
 * Token mint for client-side experience-image uploads.
 *
 * The upload itself goes browser → Vercel Blob, not through a server action:
 * actions cap the request body at 4.5 MB on Vercel, which a single phone photo
 * blows straight through. So the browser asks this route for a short-lived
 * upload token (`upload()` from `@vercel/blob/client`), and the file never
 * touches our functions at all.
 *
 * **This route is the security boundary for the blob store.** A token minted
 * here is a write grant on the company's storage, and the route is a public
 * URL — so it authorizes with the same seriousness as `/api/cron/retention`
 * treats `CRON_SECRET`. `requireAdmin()` runs inside `onBeforeGenerateToken`,
 * which only fires for the browser's token request (the one carrying the
 * operator's session cookie). The other event `handleUpload` dispatches —
 * `blob.upload-completed` — is a callback from Vercel's own servers with no
 * cookie on it; `handleUpload` authenticates that one cryptographically by
 * verifying its signature against the store token, so it must not (and does
 * not) go through the cookie check.
 *
 * The token is also as narrow as the SDK allows: image content types only,
 * ~5 MB, everything under `experiences/`, and a random suffix so an upload can
 * never overwrite an existing blob by picking its name.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const actor = await requireAdmin();

        // The client names the path, so the prefix is enforced here — the one
        // place the browser cannot reach around. Everything this route mints
        // lands under `experiences/`, keeping the store greppable and the
        // Zod rule on the column honest about where its URLs come from.
        if (!pathname.startsWith(EXPERIENCE_IMAGE_PATH_PREFIX)) {
          throw new Error(`unexpected upload path: ${pathname}`);
        }

        /*
         * Audited at token mint, not in `onUploadCompleted`: the completion
         * callback comes from Vercel's servers, which never reaches localhost
         * or preview deployments, and it carries no operator session. The mint
         * is the moment an operator was authorized to write this pathname —
         * that is the fact the trail needs.
         */
        await recordAuditOrWarn({
          actorUserId: actor.id,
          action: "experience.image_uploaded",
          entityType: "experience",
          after: { pathname },
        });

        return {
          allowedContentTypes: [...EXPERIENCE_IMAGE_CONTENT_TYPES],
          maximumSizeInBytes: EXPERIENCE_IMAGE_MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(response);
  } catch (err) {
    // `requireAdmin()` refuses by throwing Next's redirect — let it through,
    // so a signed-out caller is turned away exactly like on any admin page.
    unstable_rethrow(err);

    console.error("[admin] experience image upload refused", err);
    // The message reaches the operator through the form's inline error. Say
    // what they can act on; the specifics are in the server log above.
    return NextResponse.json(
      { error: "Couldn't start the upload. Try again, or use a smaller photo." },
      { status: 400 },
    );
  }
}

// Mints per-request tokens against the live session — never prerender.
export const dynamic = "force-dynamic";
