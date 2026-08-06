"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

/**
 * Sign-in form for the admin area. `next` carries the originally requested path.
 *
 * Email *and* password, since the area moved from one shared password to per-user
 * accounts — which is what gives the audit log an actor to name.
 *
 * This is the front door of the installed app, so the details matter (spec §8
 * E7): 16px fields so iOS never zooms on focus, `username`/`current-password`
 * tokens so password managers fill both, `enterkeyhint` so the keyboard's
 * action key reads next/go, and no `autoFocus` — popping the keyboard before
 * the operator has even seen the screen hides half of it on a phone.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          enterKeyHint="next"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          enterKeyHint="go"
          required
        />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
