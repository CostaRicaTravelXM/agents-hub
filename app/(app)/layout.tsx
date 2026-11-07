import { redirect } from "next/navigation";
import { after } from "next/server";
import { needsWelcome, requireViewer } from "@/lib/auth";
import { ensureCrmLead } from "@/lib/hub/crm";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  if (needsWelcome(viewer.profile)) redirect("/welcome");
  // First confirmed sign-in with a complete profile: the lead goes to Zoho CRM
  // once, after this response has been sent, so nobody waits on n8n.
  after(() => ensureCrmLead(viewer));
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
