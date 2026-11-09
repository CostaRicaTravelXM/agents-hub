import { NextResponse, type NextRequest } from "next/server";
import { createAnonClient } from "@/lib/supabase/server";
import { renderCertificate } from "@/lib/certificate-pdf";
import { certificateVerifyUrl } from "@/lib/certificate-url";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/** Certificate PDF. Anyone holding a valid code can download it, the same as the public verify page. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/certificates/[code]">) {
  const { code } = await ctx.params;
  const { data } = await createAnonClient().rpc("verify_certificate", { p_code: code });
  const cert = data?.[0];
  if (!cert) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });

  const pdf = await renderCertificate({
    recipient: cert.recipient_name,
    course: cert.course_title,
    code: cert.code,
    issuedAt: cert.issued_at,
    verifyUrl: certificateVerifyUrl(env.appUrl, cert.code),
  });
  const download = request.nextUrl.searchParams.get("download") === "1";
  const filename = `TravelXM-${cert.course_title.replace(/[^A-Za-z0-9]+/g, "-")}-${cert.code}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
