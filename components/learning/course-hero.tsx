import { DetailHero } from "@/components/hub/detail-hero";

export function CourseHero({
  courseId,
  coverKey,
  meta,
  title,
  subtitle,
  back,
}: {
  courseId: string;
  coverKey: string | null;
  meta: string;
  title: string;
  subtitle?: string | null;
  back: { href: string; label: string };
}) {
  return (
    <DetailHero
      back={back}
      imageKey={coverKey}
      imageLabel="Course photo"
      meta={meta}
      title={title}
      subtitle={subtitle}
      viewTransitionName={`cover-${courseId}`}
    />
  );
}
