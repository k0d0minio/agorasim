"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { inviteUser, type InviteUserState } from "@/app/admin/actions";
import { ADMIN_ROLES, MIN_PASSWORD_LENGTH_HINT, adminRoleMeta } from "@/lib/admin-format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create account"}
    </Button>
  );
}

/**
 * Add an operator by setting a temporary password for them.
 *
 * A signed invite link would be the nicer flow, but sending one needs an email
 * transport this deployment does not have yet. A password read out over the
 * phone and changed on first sign-in is honest about that, and the account is
 * real from the moment it exists rather than pending an email nobody sent.
 */
export function InviteUserForm() {
  const [state, formAction] = useActionState<InviteUserState, FormData>(inviteUser, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add someone to the team</CardTitle>
        <CardDescription>
          Set a temporary password and pass it on directly. They change it from their own
          account screen the first time they sign in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-name">Name</Label>
            {/* The owner is entering a *colleague's* details — their own
                autofill would only ever be wrong here. */}
            <Input id="invite-name" name="name" autoComplete="off" enterKeyHint="next" required />
            {state.fieldErrors?.name ? (
              <p className="text-sm text-destructive" role="alert">
                {state.fieldErrors.name}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              autoComplete="off"
              enterKeyHint="next"
              required
            />
            {state.fieldErrors?.email ? (
              <p className="text-sm text-destructive" role="alert">
                {state.fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-password">Temporary password</Label>
            <Input
              id="invite-password"
              name="password"
              type="text"
              autoComplete="off"
              required
            />
            <p className="text-xs text-muted-foreground">{MIN_PASSWORD_LENGTH_HINT}</p>
            {state.fieldErrors?.password ? (
              <p className="text-sm text-destructive" role="alert">
                {state.fieldErrors.password}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select id="invite-role" name="role" defaultValue="collaborator">
              {ADMIN_ROLES.map((role) => (
                <option key={role} value={role}>
                  {adminRoleMeta[role].label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              {adminRoleMeta.collaborator.description}
            </p>
          </div>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <SubmitButton />
            {state.message ? (
              <p className="text-sm text-muted-foreground" role="status">
                {state.message}
              </p>
            ) : null}
            {state.error ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
