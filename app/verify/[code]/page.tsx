import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CircleX, Download } from "lucide-react";
import { createAnonClient } from "@/lib/supabase/server";
import { BrandLink } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/verify/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: `Verify certificate ${code.toUpperCase()}`, robots: { index: false } };
}

export default async function VerifyPage({ params }: PageProps<"/verify/[code]">) {
  const { code } = await params;
  const { data } = await createAnonClient().rpc("verify_certificate", { p_code: code });
  const cert = data?.[0];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="xm-container flex h-24 items-center">
        <BrandLink />
      </header>
      <main className="xm-container flex flex-1 items-start justify-center pt-8 pb-16 md:items-center md:pt-0">
        <div className="xm-reveal w-full max-w-xl rounded-lg bg-card p-8 shadow-raised md:p-12">
          {cert ? (
            <>
              <span className="grid size-14 place-items-center rounded-pill bg-olive text-white">
                <BadgeCheck aria-hidden className="size-7 stroke-[1.75]" />
              </span>
              <p className="mt-6 inline-flex items-center gap-2 font-ui text-[15px] font-semibold text-success">This certificate is genuine</p>
              <h1 className="mt-3 font-serif text-[34px] leading-tight font-bold text-ink italic">{cert.recipient_name}</h1>
              <p className="mt-2 text-[17px] text-body">has completed</p>
              <p className="mt-2 font-certificate text-[36px] leading-none text-ink uppercase md:text-[44px]">{cert.course_title}</p>
              <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-line pt-6">
                <div>
                  <dt className="xm-micro text-muted">Issued</dt>
                  <dd className="mt-1 font-ui text-[15px] font-semibold text-ink">
                    {formatDate(cert.issued_at, { month: "long", day: "numeric", year: "numeric" })}
                  </dd>
                </div>
                <div>
                  <dt className="xm-micro text-muted">Certificate</dt>
                  <dd className="mt-1 font-ui text-[15px] font-semibold text-ink">{cert.code}</dd>
                </div>
              </dl>
              <p className="mt-6 text-[15px] text-muted">
                Issued by TravelXM Academy, the training program of TravelXM, a Costa Rican tour operator based in San José.
              </p>
              <Button asChild variant="secondary" className="mt-6">
                <a href={`/api/certificates/${cert.code}`} target="_blank" rel="noopener noreferrer">
                  <Download aria-hidden /> View certificate PDF
                </a>
              </Button>
            </>
          ) : (
            <>
              <span className="grid size-14 place-items-center rounded-pill bg-danger text-white">
                <CircleX aria-hidden className="size-7 stroke-[1.75]" />
              </span>
              <h1 className="xm-title-sm mt-6">Certificate not found</h1>
              <p className="mt-3 text-[17px] text-body">
                We could not find a certificate with the code <span className="font-semibold">{code.toUpperCase()}</span>. Check the code
                for typos. Codes look like TXM-2026-ABC234.
              </p>
              <Button asChild className="mt-6">
                <Link href="/">Go to TravelXM Academy</Link>
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
