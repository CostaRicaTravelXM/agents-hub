import { LearningSubnav } from "@/components/learning/learning-subnav";

/** Courses, progress, certificates and resources share one sub-navigation. */
export default function LearningLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LearningSubnav />
      {children}
    </>
  );
}
