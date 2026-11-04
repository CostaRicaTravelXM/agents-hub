import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Shared with the Agent Portal; see env.authCookieDomain.
    { cookieOptions: { domain: process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN || undefined } },
  );
}
