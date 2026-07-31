import { requireOwner } from "@/lib/admin-auth";
import { listAdminUsers } from "@/lib/admin-users";
import { adminRoleMeta, formatDate, formatDateTime } from "@/lib/admin-format";
import { AdminShell } from "@/components/admin/admin-shell";
import { InviteUserForm } from "@/components/admin/invite-user-form";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * Team accounts. Owner-only, enforced here and again inside every action this
 * page can reach — hiding the nav entry is chrome, `requireOwner()` is the gate.
 */
export default async function AdminUsersPage() {
  await requireOwner();
  const users = await listAdminUsers();

  return (
    <AdminShell>
      <div className="flex flex-col gap-8">
        <InviteUserForm />

        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {users.length} account{users.length === 1 ? "" : "s"}. Accounts are disabled
            rather than deleted, so the audit log always resolves to a real person.
          </p>

          <Card className="overflow-x-auto p-0">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Last sign-in</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const role = adminRoleMeta[user.role];
                  return (
                    <TableRow key={user.id} className="align-top">
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <a
                          href={`mailto:${user.email}`}
                          className="text-muted-foreground hover:text-primary"
                        >
                          {user.email}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.variant}>{role.label}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(user.lastLoginAt)}
                      </TableCell>
                      <TableCell>
                        {user.disabledAt ? (
                          <Badge variant="outline">Disabled</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <UserRowActions
                            id={user.id}
                            name={user.name}
                            disabled={Boolean(user.disabledAt)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </section>
      </div>
    </AdminShell>
  );
}
