import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/ui";
import { CourseForm } from "@/components/admin/course-form";

export const metadata: Metadata = { title: "New course" };

export default async function NewCourse() {
  await requireStaff();
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("id, name").order("sort_order");
  return (
    <>
      <AdminHeader
        back={{ href: "/admin/courses", label: "Courses" }}
        title="Create a course"
        description="The course starts as a draft. Add modules and lessons, then publish it from the Access tab."
      />
      <div className="rounded-lg bg-card p-5 shadow-card md:p-8">
        <CourseForm categories={categories ?? []} />
      </div>
    </>
  );
}
