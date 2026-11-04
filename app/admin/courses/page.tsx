import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mediaUrl } from "@/lib/media";
import { LEVEL_LABEL } from "@/lib/course";
import { AdminHeader, Table, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, StatusDot } from "@/components/ui/surface";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Courses" };

const statusTone = { published: "success", draft: "warning", archived: "muted" } as const;

export default async function AdminCourses() {
  await requireStaff();
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, slug, status, visibility, level, cover_key, updated_at, category:categories(name), modules(id), lessons(id), enrollments(id)")
    .order("sort_order");

  return (
    <>
      <AdminHeader
        title="Courses"
        description="Create learning paths, organise modules and lessons, and decide who can see each course."
        actions={
          <Button asChild>
            <Link href="/admin/courses/new">
              <Plus aria-hidden /> New course
            </Link>
          </Button>
        }
      />
      {courses?.length ? (
        <Table>
          <thead>
            <tr>
              <Th>Course</Th>
              <Th>Status</Th>
              <Th>Access</Th>
              <Th className="text-right">Modules</Th>
              <Th className="text-right">Lessons</Th>
              <Th className="text-right">Enrolled</Th>
              <Th>Updated</Th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => {
              const cover = mediaUrl(c.cover_key);
              return (
                <tr key={c.id} className="transition-colors duration-120 hover:bg-page">
                  <Td>
                    <Link href={`/admin/courses/${c.id}`} className="group flex items-center gap-3">
                      <span className="relative block h-11 w-16 shrink-0 overflow-hidden rounded-md bg-sunken">
                        {cover ? <Image src={cover} alt="" fill sizes="64px" className="object-cover" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink group-hover:text-link">{c.title}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {LEVEL_LABEL[c.level]} · {c.category?.name ?? "No category"}
                        </span>
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2 capitalize">
                      <StatusDot tone={statusTone[c.status]} /> {c.status}
                    </span>
                  </Td>
                  <Td>{c.visibility === "groups" ? <Badge tone="warning">Groups</Badge> : <Badge tone="neutral">Everyone</Badge>}</Td>
                  <Td className="text-right tabular-nums">{c.modules.length}</Td>
                  <Td className="text-right tabular-nums">{c.lessons.length}</Td>
                  <Td className="text-right tabular-nums">{c.enrollments.length}</Td>
                  <Td className="whitespace-nowrap text-muted">{formatDate(c.updated_at)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          title="No courses yet"
          body="Start with a course, then add modules and lessons."
          action={
            <Button asChild>
              <Link href="/admin/courses/new">Create the first course</Link>
            </Button>
          }
        />
      )}
    </>
  );
}
