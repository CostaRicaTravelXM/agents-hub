import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  if (!viewer.profile.first_name || !viewer.profile.last_name) redirect("/welcome");
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
