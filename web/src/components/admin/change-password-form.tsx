"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { changeOwnPassword, type ChangePasswordState } from "@/app/admin/actions";
import { MIN_PASSWORD_LENGTH_HINT } from "@/lib/admin-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Change password"}
    </Button>
  );
}

/**
 * Change your own password.
 *
 * Succeeding signs you out everywhere — including here — and the action
 * redirects to the login screen, so there is no success state to render. That is
 * deliberate: the new password is proven to work by the sign-in that follows,
 * and any session on a device you no longer control dies with the old one.
 */
export function ChangePasswordForm() {
  const [state, formAction] = useActionState<ChangePasswordState, FormData>(
    changeOwnPassword,
    {},
  );

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        {state.fieldErrors?.currentPassword ? (
          <p className="text-sm text-destructive" role="alert">
            {state.fieldErrors.currentPassword}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-muted-foreground">{MIN_PASSWORD_LENGTH_HINT}</p>
        {state.fieldErrors?.newPassword ? (
          <p className="text-sm text-destructive" role="alert">
            {state.fieldErrors.newPassword}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Repeat new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
        {state.fieldErrors?.confirmPassword ? (
          <p className="text-sm text-destructive" role="alert">
            {state.fieldErrors.confirmPassword}
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Changing your password signs you out on every device, including this one.
      </p>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
