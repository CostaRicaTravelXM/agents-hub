import type { Metadata } from "next";
import Link from "next/link";
import { Award, Download, Eye } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getMyCertificates } from "@/lib/queries";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { CertificateArt } from "@/components/learning/certificate-art";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/surface";
import { CopyLink } from "@/components/learning/copy-link";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  const viewer = await requireViewer();
  const certificates = await getMyCertificates(viewer.id);
  return (
    <Page className="pt-6 md:pt-8">
      <PageHeader
        title="Certificates"
        lead="Download a PDF for your files, or share the verification link with clients and suppliers."
      />
      {certificates.length ? (
        <ul className="grid gap-6 md:grid-cols-2">
          {certificates.map((c) => (
            <li key={c.id} className="xm-reveal">
              <article className="overflow-hidden rounded-lg bg-card shadow-card">
                <CertificateArt
                  titleAs="h2"
                  name={c.recipient_name}
                  courseTitle={c.course_title}
                  footer={`Issued ${formatDate(c.issued_at, { month: "long", day: "numeric", year: "numeric" })} · ${c.code}`}
                />
                <div className="flex flex-wrap items-center gap-2 border-t border-line p-4">
                  <Button asChild>
                    <a href={`/api/certificates/${c.code}?download=1`}>
                      <Download aria-hidden /> Download PDF
                    </a>
                  </Button>
                  <Button asChild variant="ghost">
                    <a href={`/api/certificates/${c.code}`} target="_blank" rel="noopener noreferrer">
                      <Eye aria-hidden /> View
                    </a>
                  </Button>
                  <CopyLink path={`/verify/${c.code}`} />
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Award aria-hidden />}
          title="No certificates yet"
          body="Finish every required lesson in a course, including its quiz, and the certificate appears here straight away."
          action={
            <Button asChild>
              <Link href="/courses/costa-rica-specialist">Start the Costa Rica Specialist</Link>
            </Button>
          }
        />
      )}
    </Page>
  );
}
