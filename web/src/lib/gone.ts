/**
 * 410 Gone, for the WordPress machinery the old site exposed.
 *
 * Feeds, the REST API, XML-RPC, the uploads folder, the admin and login
 * screens: none of these has a successor here, and each still gets traffic —
 * feed readers that were never told to stop, and the bot fleet that probes
 * every host for `/xmlrpc.php` and `/wp-login.php`. A 404 says "not here right
 * now" and earns a retry; 410 says "gone, on purpose", which is what makes a
 * crawler drop the URL and a well-behaved reader unsubscribe.
 *
 * Every method gets the same answer. The classic WordPress abuse is a POST,
 * and a 405 for it would be a half-truth — the resource is not here to have
 * methods.
 *
 * The `route.ts` files under `app/` whose folders spell out the old paths
 * re-export these handlers: the folder is the route, this is the response.
 * The redirects for the old *pages* live in `legacy-redirects.ts`.
 */
const BODY =
  "Gone. This address belonged to the previous agorasim.pt site and has been retired.\n";

export function gone(): Response {
  return new Response(BODY, {
    status: 410,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Permanent by nature; let browsers and the CDN keep the answer.
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}

export { gone as GET, gone as HEAD, gone as POST, gone as PUT, gone as PATCH, gone as DELETE };
