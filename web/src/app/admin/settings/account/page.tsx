import { requireAdmin } from "@/lib/admin-auth";
import { adminRoleMeta, formatDateTime } from "@/lib/admin-format";
import { AdminShell } from "@/components/admin/admin-shell";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { SignOutEverywhereButton } from "@/components/admin/sign-out-everywhere-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Reads the signed-in account — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * Your own account. Open to every operator, not just owners: needing an owner to
 * change your own password is exactly how a team drifts back to sharing one.
 */
export default async function AdminAccountPage() {
  const viewer = await requireAdmin();
  const role = adminRoleMeta[viewer.role];

  return (
    <AdminShell>
      <div className="flex max-w-3xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {viewer.name}
              <Badge variant={role.variant}>{role.label}</Badge>
            </CardTitle>
            <CardDescription>{viewer.email}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
            <p>{role.description}</p>
            <p>Última entrada: {formatDateTime(viewer.lastLoginAt)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mudar a palavra-passe</CardTitle>
            <CardDescription>
              Tudo o que faz aqui fica registado nesta conta, por isso ela deve ser só sua.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sair de todos os dispositivos</CardTitle>
            <CardDescription>
              Termina todas as sessões em todos os dispositivos — um telemóvel esquecido
              num táxi, um navegador num computador partilhado. Também terá de voltar a
              entrar aqui.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignOutEverywhereButton />
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
