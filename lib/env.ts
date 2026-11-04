function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable ${name}. Copy .env.example to .env.local.`);
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  get supabaseServiceKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  },
  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
  /**
   * Shared auth cookie domain (".travelxm.com" in production) so one sign-in
   * covers the Academy and the Agent Portal. Unset locally: host-only cookies,
   * which localhost already shares across ports.
   */
  get authCookieDomain() {
    return process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN || undefined;
  },
  get googleAuth() {
    return process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";
  },
};
