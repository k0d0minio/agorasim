import { Inbox } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";

export default function AdminSubmissionsPage() {
  return (
    <AdminShell title="Submissions">
      <PlaceholderPanel
        icon={Inbox}
        title="No submissions yet"
        description="Once the booking/contact form is wired up, enquiries will appear here for the team to review and follow up."
      />
    </AdminShell>
  );
}
