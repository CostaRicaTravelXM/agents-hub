import "server-only";
import type { Viewer } from "@/lib/auth";
import { needsWelcome } from "@/lib/auth";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { buildAgentsHubPayload, buildAgentsHubZohoLead } from "@/lib/hub/crm-payload";
import { addTags, createLead, findAdvisor, zohoConfigured } from "@/lib/zoho/client";

/** Written on a Zoho record that already existed when its owner joined the Hub. */
export const HUB_MEMBER_TAG = "Agents Hub member";

export { buildAgentsHubPayload, type AgentsHubPayload } from "@/lib/hub/crm-payload";

/**
 * Sends the lead once per account. Safe to call on every app render: the
 * database lease makes concurrent calls and retries harmless, and both senders
 * de-duplicate by email. Never throws.
 *
 * With the ZOHO_* values set the Hub talks to Zoho CRM itself: someone Zoho
 * already knows (a Contact, or a Lead from a campaign) is only tagged, so their
 * Lead Source and details stay as they are; anyone else becomes a new Lead.
 * Without those values it falls back to the n8n webhook, and with neither it skips.
 */
export async function ensureCrmLead(viewer: Viewer): Promise<void> {
  const direct = zohoConfigured();
  const url = env.n8nAgentsWebhookUrl;
  if ((!direct && !url) || needsWelcome(viewer.profile)) return;
  try {
    const supabase = createServiceClient();
    const payload = buildAgentsHubPayload(viewer.profile, viewer.email);
    const { data: claimed, error } = await supabase.rpc("claim_hub_crm_lead", { p_user: viewer.id, p_payload: payload });
    if (error || !claimed) return;

    let lastError: string | null = null;
    let zohoRecordId: string | null = null;
    if (direct) {
      const found = await findAdvisor(viewer.email);
      if (!found.ok) lastError = found.message;
      else if (found.data) {
        const tagged = await addTags(found.data.module, found.data.id, [HUB_MEMBER_TAG]);
        if (tagged.ok) zohoRecordId = found.data.id;
        else lastError = tagged.message;
      } else {
        const res = await createLead(buildAgentsHubZohoLead(viewer.profile, viewer.email));
        if (!res.ok) lastError = res.message;
        else {
          zohoRecordId = res.data.id;
          // Zoho had the email after all (the search index can lag): tag it like any known record.
          if (!res.data.created) {
            const tagged = await addTags(res.data.module, res.data.id, [HUB_MEMBER_TAG]);
            if (!tagged.ok) lastError = tagged.message;
          }
        }
      }
    } else {
      try {
        const res = await fetch(url!, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) lastError = `n8n responded ${res.status}`;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
    await supabase
      .from("hub_crm_leads")
      .update(
        lastError
          ? { last_error: lastError }
          : { sent_at: new Date().toISOString(), last_error: null, ...(zohoRecordId ? { zoho_record_id: zohoRecordId } : {}) },
      )
      .eq("user_id", viewer.id);
  } catch (e) {
    console.error("ensureCrmLead", e);
  }
}
