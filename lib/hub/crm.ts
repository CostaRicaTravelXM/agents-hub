import "server-only";
import type { Viewer } from "@/lib/auth";
import { needsWelcome } from "@/lib/auth";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { buildAgentsHubPayload } from "@/lib/hub/crm-payload";

export { buildAgentsHubPayload, type AgentsHubPayload } from "@/lib/hub/crm-payload";

/**
 * Sends the lead once per account. Safe to call on every app render: the
 * database lease makes concurrent calls and retries harmless, and the webhook
 * itself de-duplicates by email. Never throws.
 */
export async function ensureCrmLead(viewer: Viewer): Promise<void> {
  const url = env.n8nAgentsWebhookUrl;
  if (!url || needsWelcome(viewer.profile)) return;
  try {
    const supabase = createServiceClient();
    const payload = buildAgentsHubPayload(viewer.profile, viewer.email);
    const { data: claimed, error } = await supabase.rpc("claim_hub_crm_lead", { p_user: viewer.id, p_payload: payload });
    if (error || !claimed) return;

    let lastError: string | null = null;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) lastError = `n8n responded ${res.status}`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    await supabase
      .from("hub_crm_leads")
      .update(lastError ? { last_error: lastError } : { sent_at: new Date().toISOString(), last_error: null })
      .eq("user_id", viewer.id);
  } catch (e) {
    console.error("ensureCrmLead", e);
  }
}
