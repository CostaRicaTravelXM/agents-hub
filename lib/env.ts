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
   * covers the Agents Hub and the Agent Portal. Unset locally: host-only cookies,
   * which localhost already shares across ports.
   */
  get authCookieDomain() {
    return process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN || undefined;
  },
  get googleAuth() {
    return process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";
  },
  /** The Agents Portal (quotes, bookings, verification). Unset hides its nav entry. */
  get portalUrl() {
    return process.env.NEXT_PUBLIC_AGENTS_PORTAL_URL || undefined;
  },
  /** Reads the marketing folder for the gallery. Server only. Unset: the page links out to Drive instead. */
  get googleDriveApiKey() {
    return process.env.GOOGLE_DRIVE_API_KEY || undefined;
  },
  /** Only ever overridden to point at a stand-in server during local checks. */
  get googleDriveApiUrl() {
    return process.env.GOOGLE_DRIVE_API_URL || "https://www.googleapis.com/drive/v3/files";
  },
  /** n8n "TravelXM — Agents Hub" webhook: creates the Zoho lead after sign-up. Unset skips the hand-off. */
  get n8nAgentsWebhookUrl() {
    return process.env.N8N_AGENTS_WEBHOOK_URL || undefined;
  },
};
