"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Globe, Undo2 } from "lucide-react";

import {
  setBlogPostPublished,
  type BlogPostActionState,
} from "@/app/admin/blog/actions";
import { Button } from "@/components/ui/button";

/**
 * The one control the whole blog exists for: **Publicar**.
 *
 * A plain form, not a dialog. Publishing is the outcome the studio is designed
 * to make easy — one tap, in the client's own language, with the sentence that
 * follows saying what actually happened — and it is completely reversible from
 * the same button, which is the reason it needs no confirmation step. Deleting
 * would; this is not that.
 */
function PublishSubmit({ published }: { published: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={published ? "outline" : "default"}
      disabled={pending}
    >
      {published ? <Undo2 className="size-4" /> : <Globe className="size-4" />}
      {pending
        ? published
          ? "A retirar…"
          : "A publicar…"
        : published
          ? "Retirar do site"
          : "Publicar"}
    </Button>
  );
}

export function PublishBlogPostButton({
  id,
  published,
}: {
  id: string;
  published: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<BlogPostActionState, FormData>(
    setBlogPostPublished,
    {},
  );

  // The row's badge, the date it shows and the counts above it all change with
  // this write, so the list is re-read rather than patched in place.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <div className="flex flex-col items-stretch gap-1">
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="published" value={published ? "false" : "true"} />
        <PublishSubmit published={published} />
      </form>
      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok && state.message ? (
        <p className="text-xs text-muted-foreground" role="status">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
