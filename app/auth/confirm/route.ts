import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { recoveryGrant } from "@/lib/recovery";
import { safeNext } from "@/lib/utils";

/**
 * Email links (sign-up confirmation, password recovery) land here.
 *
 * The recovery email template (supabase/templates/recovery.html) links here
 * with `token_hash`, so the link works on any device. The `code` branch covers
 * the default PKCE link, which only works in the browser that asked for it.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const supabase = await createClient();

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      if (type === "recovery" && data.user) return toResetPage(origin, data.user.id);
      return NextResponse.redirect(new URL(next, origin));
    }
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (next === "/reset-password" && data.user) return toResetPage(origin, data.user.id);
      return NextResponse.redirect(new URL(next, origin));
    }
  }
  const failed = type === "recovery" || next === "/reset-password" ? "/reset-password?expired=1" : "/login?error=link";
  return NextResponse.redirect(new URL(failed, origin));
}

function toResetPage(origin: string, userId: string) {
  const res = NextResponse.redirect(new URL("/reset-password", origin));
  const grant = recoveryGrant(userId);
  res.cookies.set(grant.name, grant.value, grant.options);
  return res;
}
