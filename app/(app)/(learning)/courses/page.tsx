import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { getCatalog } from "@/lib/queries";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { Catalog } from "@/components/learning/catalog";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage({ searchParams }: PageProps<"/courses">) {
  const viewer = await requireViewer();
  const { category } = await searchParams;
  const courses = await getCatalog(viewer.id);
  return (
    <Page className="pt-6 md:pt-8">
      <PageHeader
        title="Masterclasses"
        lead="Recorded sessions from the TravelXM team in San José. Watch one, pass the quiz and get a certificate your clients can check."
      />
      <Catalog courses={courses} initialCategory={typeof category === "string" ? category : undefined} />
    </Page>
  );
}
