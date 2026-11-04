import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { getCatalog } from "@/lib/queries";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { Catalog } from "@/components/learning/catalog";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage() {
  const viewer = await requireViewer();
  const courses = await getCatalog(viewer.id);
  return (
    <Page>
      <PageHeader
        title="Learn Costa Rica"
        lead="Destination deep dives, sales playbooks and the Costa Rica Specialist certification. Short lessons you can finish between client calls."
      />
      <Catalog courses={courses} />
    </Page>
  );
}
