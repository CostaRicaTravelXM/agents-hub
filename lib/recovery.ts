import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Password changes are only allowed right after the agent opens the reset
 * link we email them. /auth/confirm sets this signed, short-lived cookie when
 * a recovery link is verified; /reset-password and updatePassword require it.
 * A signed-in session alone (someone at an unlocked computer) is not enough.
 */
export const RECOVERY_COOKIE = "xm_recovery";
export const RECOVERY_TTL_SECONDS = 15 * 60;

function secret() {
  const s = process.env.AUTH_RECOVERY_SECRET || env.supabaseServiceKey;
  if (!s) throw new Error("Set AUTH_RECOVERY_SECRET (or SUPABASE_SERVICE_ROLE_KEY) to allow password resets");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Cookie value and options for a recovery grant bound to one user. */
export function recoveryGrant(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + RECOVERY_TTL_SECONDS;
  const payload = `${userId}.${exp}`;
  return {
    name: RECOVERY_COOKIE,
    value: `${payload}.${sign(payload)}`,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: RECOVERY_TTL_SECONDS,
    },
  };
}

/** True when the browser holds a valid, unexpired grant for this user. */
export async function hasRecoveryGrant(userId: string) {
  const raw = (await cookies()).get(RECOVERY_COOKIE)?.value;
  if (!raw) return false;
  const [id, exp, mac] = raw.split(".");
  if (!id || !exp || !mac || id !== userId || Number(exp) < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(`${id}.${exp}`));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function clearRecoveryGrant() {
  (await cookies()).delete(RECOVERY_COOKIE);
}
