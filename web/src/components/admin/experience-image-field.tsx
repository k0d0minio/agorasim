"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";

import {
  EXPERIENCE_IMAGE_CONTENT_TYPES,
  EXPERIENCE_IMAGE_MAX_BYTES,
  EXPERIENCE_IMAGE_PATH_PREFIX,
} from "@/lib/experience-images";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * The image control of the catalogue editor.
 *
 * This replaces a plain text input that expected an operator to type
 * `/images/car.jpg` — which only ever worked for files a developer had
 * committed to `web/public/`. Now the photo goes straight from the operator's
 * phone to blob storage (`upload()` from `@vercel/blob/client`; the token is
 * minted by `/api/admin/experiences/upload`), and what the form submits is
 * unchanged: a hidden input named `image` carrying either the new blob URL or
 * whatever the row already had. `saveExperience` and its schema never know the
 * control changed.
 *
 * The upload is client-side because it has to be — a server action on Vercel
 * caps the body at 4.5 MB, less than one phone photo.
 */

/** What the picker offers and what the client checks before sending a byte. */
const ACCEPT = EXPERIENCE_IMAGE_CONTENT_TYPES.join(",");
const MAX_MB = Math.round(EXPERIENCE_IMAGE_MAX_BYTES / (1024 * 1024));

export function ExperienceImageField({
  defaultValue,
  error,
}: {
  defaultValue: string;
  /** The server-side validation error for the `image` field, if any. */
  error?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  /** 0–100 while an upload is in flight, `null` when idle. */
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploading = progress !== null;

  async function onFileChosen(file: File | undefined) {
    if (!file) return;
    setUploadError(null);

    // Checked here so the operator hears about it before the bytes leave
    // their phone; the token the server mints enforces the same limits.
    if (!(EXPERIENCE_IMAGE_CONTENT_TYPES as readonly string[]).includes(file.type)) {
      setUploadError("That file isn't a photo. Use a JPEG, PNG, WebP or AVIF image.");
      return;
    }
    if (file.size > EXPERIENCE_IMAGE_MAX_BYTES) {
      setUploadError(
        `That photo is too large — the limit is ${MAX_MB} MB. Most phones can export a smaller copy.`,
      );
      return;
    }

    setProgress(0);
    try {
      const blob = await upload(`${EXPERIENCE_IMAGE_PATH_PREFIX}${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/experiences/upload",
        contentType: file.type,
        onUploadProgress: ({ percentage }) => setProgress(percentage),
      });
      setValue(blob.url);
    } catch (err) {
      console.error("[admin] image upload failed", err);
      // The blob client reports server refusals generically, so the words an
      // operator can act on have to come from here.
      setUploadError(
        "The upload didn't go through. Check your connection and try again — " +
          "if it never works, image storage isn't configured for this deployment yet.",
      );
    } finally {
      setProgress(null);
      // Let the same file be picked again after a failure.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const inlineError = uploadError ?? error;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="experience-image-file">Image</Label>

      {/* What `saveExperience` actually receives — same field as ever. */}
      <input type="hidden" name="image" value={value} />

      <input
        ref={fileInputRef}
        id="experience-image-file"
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(event) => onFileChosen(event.target.files?.[0])}
      />

      {value ? (
        <div className="overflow-hidden rounded-lg border">
          <div className="relative aspect-video w-full bg-muted">
            <Image
              src={value}
              alt="The photo currently chosen for this experience"
              fill
              sizes="(max-width: 640px) 100vw, 480px"
              className="object-cover"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 p-2">
            <Button
              type="button"
              variant="outline"

              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <RefreshCw className="size-4" />
              {uploading ? `Uploading… ${Math.round(progress)}%` : "Replace"}
            </Button>
            <Button
              type="button"
              variant="ghost"

              disabled={uploading}
              onClick={() => setValue("")}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
            <span className="min-w-0 flex-1 truncate text-right font-mono text-xs text-muted-foreground">
              {value}
            </span>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="h-24 w-full border-dashed"
        >
          <ImagePlus className="size-5" />
          {uploading ? `Uploading… ${Math.round(progress)}%` : "Choose a photo"}
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Shown on the website next to this experience. JPEG, PNG, WebP or AVIF, up to{" "}
        {MAX_MB} MB.
      </p>

      {inlineError ? (
        <p className="text-sm text-destructive" role="alert">
          {inlineError}
        </p>
      ) : null}

      {uploading ? (
        <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
          Uploading… {Math.round(progress)}%
        </p>
      ) : null}
    </div>
  );
}
