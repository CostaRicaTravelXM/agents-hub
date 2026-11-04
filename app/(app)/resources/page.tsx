import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { ResourceLibrary } from "@/components/learning/resource-library";
import { EmptyState } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Resources" };

export default async function ResourcesPage() {
  await requireViewer();
  const supabase = await createClient();
  // RLS limits this to resources of courses the viewer can access.
  const { data } = await supabase
    .from("resources")
    .select("id, title, description, file_key, file_size, file_mime, external_url, course:courses!inner(id, title, slug, status, sort_order)")
    .eq("course.status", "published")
    .order("sort_order");

  const groups = new Map<string, { title: string; slug: string; order: number; items: NonNullable<typeof data> }>();
  for (const r of data ?? []) {
    const g = groups.get(r.course.id) ?? { title: r.course.title, slug: r.course.slug, order: r.course.sort_order, items: [] };
    g.items.push(r);
    groups.set(r.course.id, g);
  }
  const list = [...groups.values()].sort((a, b) => a.order - b.order);

  return (
    <Page>
      <PageHeader
        title="Resources"
        lead="Fact sheets, handbooks and rate sheets from your courses. Download them for client calls or share them with your team."
      />
      {list.length ? (
        <ResourceLibrary groups={list.map((g) => ({ title: g.title, slug: g.slug, items: g.items }))} />
      ) : (
        <EmptyState icon={<FolderOpen aria-hidden />} title="No resources yet" body="Resources attached to your courses will appear here." />
      )}
    </Page>
  );
}
