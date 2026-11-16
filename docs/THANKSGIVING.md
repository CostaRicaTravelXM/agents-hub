# Thanksgiving gift page and the Zoho CRM API

What was built, how to connect Zoho, and what to do before the gift email goes out.

## What exists

| Piece | Where |
|---|---|
| Public gift page | `/thanksgiving` (`app/thanksgiving/`, `components/thanksgiving/`) |
| Videos, posters, stills | `public/thanksgiving/` (made with ffmpeg from the designer's files) |
| Hub invite by email after the gift opens | `inviteClaimToHub` in `lib/campaigns/claims.ts` |
| Claim flow (email, "is this you?", four fields, kit) | `app/thanksgiving/actions.ts`, `lib/campaigns/` |
| Kit download | `/api/thanksgiving/kit`, file in the private bucket |
| Zoho CRM client | `lib/zoho/client.ts`, field names in `lib/zoho/fields.ts` |
| Sign-up lead through Zoho | `lib/hub/crm.ts` |
| Tables | `hub_campaign_claims`, `hub_rate_hits` (migrations `20261113000001_campaign_claims.sql`, `20261113000002_claim_invites.sql`) |

Links per channel: `/thanksgiving?ch=email`, `?ch=whatsapp`, `?ch=instagram`, `?ch=facebook`, `?ch=linkedin`, `?ch=website`, `?ch=hub`. The channel is stored with the claim and sent to Zoho. No `ch` is stored as `direct`.

## Registering the people who collect the kit

Opening the gift registers the advisor in two places:

1. **Zoho CRM.** A new advisor becomes a Lead; one Zoho already knows is only tagged (table below).
2. **The Hub.** The Hub emails them a link. Opening it creates their account and signs them in, with no password. Nothing is usable before the link is opened, so typing someone else's email gives no access.

The Hub profile is filled without retyping: from the four fields for a new advisor, and from the Zoho record (name and agency) for a known one. The browser only ever sees the known advisor's details masked.

An advisor who already has a Hub account gets no email; the last screen tells them to sign in. "Send it again" on the last screen re-sends the link, three times an hour at most.

The email is the Hub's normal sign-up email (`supabase/templates/confirmation.html`), sent by Supabase through the Zoho SMTP account. For advisors who come from the gift it has its own wording ("Your gift is claimed. Your Agents Hub is ready too") and lists what the Hub offers. The hosted Supabase project does not read this file: paste the template into Authentication → Emails → Confirm signup in the production dashboard.

## How it behaves until Zoho is connected

- The page, the claim flow and the kit download all work.
- Every advisor is treated as new and fills in the four fields.
- Each claim waits in `hub_campaign_claims` (`version` is higher than `synced_version`). Nothing is lost.
- The Hub invite email is sent all the same; it does not depend on Zoho.
- Hub sign-ups keep going to the n8n webhook if `N8N_AGENTS_WEBHOOK_URL` is set.

## Connect Zoho

1. In the Zoho API console (api-console.zoho.com) create a **Self Client** used only by the Hub. Do not reuse the n8n credential.
2. Generate a grant code with exactly these scopes, and no `.ALL` scope:

   ```
   ZohoCRM.modules.leads.READ,ZohoCRM.modules.leads.CREATE,ZohoCRM.modules.leads.UPDATE,ZohoCRM.modules.contacts.READ,ZohoCRM.modules.contacts.UPDATE,ZohoSearch.securesearch.READ
   ```

3. Exchange the grant code for a refresh token (the console shows the request; the grant code lasts a few minutes).
4. Put the values in `.env.local`, and later in the hosting environment:

   ```
   ZOHO_CLIENT_ID=
   ZOHO_CLIENT_SECRET=
   ZOHO_REFRESH_TOKEN=
   ZOHO_ACCOUNTS_URL=https://accounts.zoho.com
   ZOHO_API_URL=https://www.zohoapis.com
   ```

   The two URLs depend on the data centre: `.com` for the US, `.eu`, `.in`, `.com.au` for the others.
5. Restart the app. From then on:
   - an advisor whose email is in Contacts or Leads sees "Is this you?" with masked details and confirms with one tap;
   - a new advisor becomes a Lead with Lead Source `Thanksgiving 2026`;
   - a Hub sign-up that Zoho does not know becomes a Lead with Lead Source `Agents Hub`, written by the Hub itself; one Zoho already knows is only tagged `Agents Hub member`. n8n is no longer called.
6. Send the claims that were waiting. Signed in as staff, run this in the browser console on the Hub:

   ```js
   await (await fetch("/api/admin/campaigns/sync", { method: "POST" })).json()
   ```

   It answers with how many were sent, failed and are still waiting, and under `invites` how many failed Hub invites were sent again. It is safe to run again.

## What is written in Zoho

| Advisor | Record | What changes |
|---|---|---|
| Already a Contact or Lead | The existing record | Tags only: `Thanksgiving 2026`, `TG26 via <channel>`, then `TG26 downloaded kit` and `TG26 opened FAM` when they happen. No field is overwritten. |
| New | A new Lead | First name, last name, email, company (or `Independent`), phone, Lead Source `Thanksgiving 2026`, plus the same tags. |
| Hub sign-up, not in Zoho | A new Lead | Same fields, Lead Source `Agents Hub`. |
| Hub sign-up, already a Contact or Lead | The existing record | Tag `Agents Hub member` only. This includes advisors who came in through the gift: their Lead Source stays `Thanksgiving 2026`. |

The gift also adds the tag `TG26 Hub invited` once the invite email is sent.

Tags were chosen because they need no custom fields. To also fill custom fields (channel, partner type), put their API names in `lib/zoho/fields.ts`; they are `null` today and therefore not sent.

## Not verified against real Zoho

Everything was tested against a stand-in server, not Zoho itself. Check these on the first real run, with one test lead that is deleted afterwards:

- the search scope: if a lookup answers `OAUTH_SCOPE_MISMATCH`, the scope list above is missing something for search;
- the tag call (`POST /crm/v7/{module}/{id}/actions/add_tags` with a `tags` list in the body);
- that `Thanksgiving 2026` is accepted as a Lead Source value (add it to the picklist in Zoho if not);
- which workflow rules fire: the upsert asks Zoho to run workflows.

## Decisions still open

- **Lead Source picklist and the welcome template** in Zoho (next section) are yours to create.
- **Editing details of a known advisor.** Not offered. A known record is only confirmed or declined ("Not you? Use another email").

## Welcome email: the Zoho workflow rule

Decided: Zoho sends the welcome email, so n8n is out. Create this rule before setting the `ZOHO_*` values in production, or sign-ups get no welcome email in between.

1. Zoho CRM → Setup → Automation → Workflow Rules → Create Rule. Module: **Leads**.
2. When: **Record action → Create**.
3. Condition: **Lead Source is `Agents Hub`**.
4. Instant action: **Email notification** to the Lead's email, with the welcome template (copy the text n8n sends today).

Who gets it: only advisors who are new to Zoho and signed up on the Hub. Advisors who came through the gift get the Hub invite email instead, and records that already existed get nothing, since no Lead is created.

## Before the send

- **Email limits.** Every claim sends one Hub invite. Supabase caps auth emails per hour (Authentication → Rate Limits → "emails sent", 30 an hour by default with custom SMTP), and Zoho Mail has its own daily sending cap. Raise the Supabase limit to cover the first hours after the send, and check the Zoho Mail cap for `support@travelxm.com`. A refused invite never blocks the gift: it is recorded on the claim (`hub_invite_error`) and sent again by the staff sync above.

- **iPhone.** Safari could not be run on this machine. Open the page on a real iPhone (same Wi-Fi, `http://<this computer's address>:3000/thanksgiving`) and check that the gift has no black box behind it and that the button opens the sheet. Try Low Power Mode too: the page should show a still gift with a working button.
- **Production media.** Upload the kit with `node --env-file=<production env> scripts/upload-campaign-kit.mts "<pdf>" --apply`. The videos are served from the app's own files, which is fine at this size.
- **Turnstile.** Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` to turn the bot check on. Without them only the limits apply: 10 lookups an hour per connection and 5 per email.
- **Database.** The migration must be applied to production with the rest of the release (`docs/DEPLOY.md`).
- **The Hub must be live.** The page is part of the Hub, so it goes out when the Hub does.

## Tests

- `npm run test`: Zoho client, lead mapping, masking, channel parsing.
- `npm run test:db`: claim lease, rate limiter, who can read claims.
- `npx playwright test tests/e2e/thanksgiving.spec.ts --project=desktop`: the gift covering phone screens, and the whole new-advisor flow through the PDF, the invite email and the first Hub sign-in.
