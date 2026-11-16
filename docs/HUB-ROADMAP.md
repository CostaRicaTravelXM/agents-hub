# Agents Hub roadmap

Written 2026-11-16 from the meeting of 2026-11-13 and the ChatGPT analysis shared the same day. Nothing in Phases 1 to 4 is built yet; each phase starts when Keiron says so.

## The idea

Every contact with a travel advisor should lead into the Hub. An advisor comes for one trip and, once inside, sees FAM trips, masterclasses, books, marketing material and offers (the "airport shops" idea from the meeting).

Today an advisor emails Bruce, is asked to fill a Zoho form, and staff are supposed to type the request into the CRM by hand, which often does not happen. The Hub should register the advisor and capture the request by itself.

## What exists today

- Hub modules: Learning, FAM Trips, Current Offers, Books, Marketing Assets.
- Registration with name, email, agency and an "independent" checkbox. Phone is only on the profile page.
- Sign-in by password or emailed link. Google sign-in is built and switched off.
- Thanksgiving gift page that registers the advisor in Zoho and emails a Hub invite.
- Zoho client for Leads and Contacts only (`lib/zoho/client.ts`). Nothing creates Deals.
- The separate Agents Portal holds the full verification form (partner type, host agency, seller of travel licence) in `agent_verifications`.
- Missing: partner type at registration, staff creating accounts, any request form in the Hub, social links in the Hub, any email sender other than Supabase Auth.

## Phase 0: Thanksgiving, ready for the Nov 17 send

Feedback from the meeting on the gift page:

- **Make the Hub note on the last screen more prominent.** Today it is small text under the download button. Turn it into a clear second block, "Your Agents Hub is ready", with the button. File: `components/thanksgiving/claim-sheet.tsx` (`HubNote`). Built 2026-11-16.
- **The gift must be reachable from the email and inside the Hub.** Someone who opens the invite email asks "where is my gift?".
  - Add a "Download your Selling Kit" link to the gift branch of `supabase/templates/confirmation.html`, pointing to `/thanksgiving`. Built 2026-11-16.
  - Let a signed-in Hub user whose email has a confirmed claim open the kit without the claim cookie: `app/api/thanksgiving/kit` checks the session email against `hub_campaign_claims`.
  - Show a "Your Thanksgiving gift" tile on Hub Home for those users. The tile is conditional, so it is added in the Home page, not in the static list in `components/shell/nav-config.ts`. Built 2026-11-16; it links to the gift page.
- **Connect real Zoho** (needs Keiron): dedicated Self Client, `ZOHO_*` values, one approved test lead. Steps are in `docs/THANKSGIVING.md`.
- **Production settings** (needs Keiron): invite link expiry to 24 hours, Supabase emails-per-hour limit, paste the new email template, check the Zoho Mail daily cap.
- **iPhone check** on a real device.

## Phase 1: quick wins, about one week

Small changes that each stand alone, in suggested order.

### 1.1 Registration captures what the CRM needs

- Add **partner type** to the register form: Independent travel agent, Travel agent under a host agency, Host agency. It replaces the "independent" checkbox (independent still sets `is_independent`). When "under a host agency" is chosen, ask the host agency name.
- Add **phone, optional**. Email stays the key.
- Store: new `profiles.partner_type` and `profiles.host_agency` columns (one migration); `handle_new_user()` reads them from the sign-up metadata.
- Send to Zoho: `lib/hub/crm-payload.ts` already types `partnerType` with the three values, and `lib/zoho/fields.ts` has `partnerType: null`. Put the real Zoho field API name there. The name must come from Keiron or Rohan.
- Same field on the Thanksgiving four-field form, so both doors collect the same thing.
- Files: `components/auth-forms.tsx` (`AgencyFields`), `app/actions/auth.ts` (`agencyFields` schema), `components/thanksgiving/claim-sheet.tsx`, `app/thanksgiving/actions.ts`, one migration, tests.

### 1.2 Sign in with Google

- The button, action and callback already exist. To turn it on: a Google Cloud OAuth client (Keiron creates it), its id and secret in Supabase, and `NEXT_PUBLIC_GOOGLE_AUTH=true`.
- An advisor who signs in with Google using the same email as an existing account lands in that same account.
- Facebook is not built. Later, only if advisors ask for it (Phase 4).

### 1.3 Staff create an account for an advisor

- Scenario from the meeting: an advisor emails Bruce; staff register them; the advisor gets an email "you are in our Hub" with a one-tap link.
- New admin screen "Invite advisor" under Agents: first name, last name, email, partner type, agency, phone.
- It reuses the invite code written for the gift (`inviteClaimToHub` in `lib/campaigns/claims.ts`), generalised into `inviteAdvisor`, and the same Zoho rule: find first, tag if found, create a Lead if not.
- A third branch in the email template: "TravelXM created your Agents Hub account".
- Files: `app/admin/agents/`, `app/actions/admin.ts`, `lib/hub/invite.ts` (new, extracted), `supabase/templates/confirmation.html`.

### 1.4 Social links and an open front door

- Floating social bar on the Hub, on the public landing and on signed-in pages, with the same five networks as the main site (`TravelXM Front/components/ui/SocialLinks.tsx`, `FloatingSocials.tsx`). People who will not register can still follow.
- The public landing (`app/page.tsx`) shows what is inside each module, so a visitor understands the Hub before registering.
- Main site: rename the "Agents" nav item to "Agent Hub" (`TravelXM Front/components/sections/Navbar.tsx:13`). `AgentGate.tsx` stays untouched.

### 1.5 Links, QR and signature kit

No feature code beyond storing the channel.

- Every door gets a tracked link, using the `?ch=` idea built for the gift, extended to `/register` and the landing: `?ch=signature`, `?ch=event`, `?ch=outside-agents`, `?ch=email`. The channel is stored on the profile and sent to Zoho as a tag.
- A QR code image for Bruce's event pamphlets (points to `?ch=event`).
- An email signature block for Marilú and support: FAM Trips, Masterclasses, Books, Marketing, each linking into the Hub.
- A one-page PDF "How to join the Agents Hub" to attach to reply emails.
- The link for María Paz to place in the Outside Agents supplier portal.

## Phase 2: quote request in the Hub, about two weeks

The core of the meeting: replace "email Bruce, then someone types it into the CRM" with a request that enters the system by itself.

### 2.1 The request

- **New module "Request a quote"** in the Hub nav. A short form: destination or trip type, dates, number of travellers, budget (optional) and a free message. A request with only the message filled is accepted. Fields accept "Not decided yet".
- Name, email, agency and partner type come from the profile and are not asked again. Missing ones (phone) are asked once and saved to the profile.
- **A request button on every selling page**: each offer, FAM trip, book and marketing brochure gets "Plan this for my client". The request records which page it came from, and that source goes to Zoho.
- **Hub Home leads with selling**: the request button, the advisor's open requests and their next step come before Learning.
- A draft is saved while typing. A double submit creates one request.

### 2.2 Tracking

- Stored in a new `hub_booking_requests` table with a readable number, for example `BR-2026-0142`.
- The advisor sees "My requests" with number and status. Three separate states: **request received**, **proposal sent**, **booking confirmed**. A Travefy itinerary or a payment alone never shows as confirmed.
- The confirmation screen states the reference number, the status and when to expect an answer.
- Staff can paste the Travefy proposal link on the request, so the advisor finds it in "My requests". Replies stay by email, as agreed in the meeting.

### 2.3 Into the CRM

- Sent to Zoho with the same pattern as the gift: stored first, sent after, retried by the staff sync. A Zoho outage loses nothing.
- Staff are told by a Zoho workflow rule on the new record (email to Marilú and Bruce). No new email sender in the app.
- Every request has an owner or sits in a watched queue. The staff sync lists requests with no owner or a failed send.
- **Open decision, needs the CRM owner:** which Zoho record a request becomes. Recommendation: a **Deal** linked to the advisor's Contact (converting the Lead when needed), since the meeting asked for "a contact and a deal". This needs new Zoho scopes (`deals.CREATE`, `contacts.CREATE`) and the Deal pipeline and stage names. Fallback: a Note plus a tag on the existing Lead or Contact.

### 2.4 Staff raise a request for an advisor

- Second scenario from the meeting: in admin, pick or invite the advisor (1.3), paste what they wrote in their email, save. The advisor gets the link to it.
- The Agents Portal has its own `quote_requests`. The Hub request is the simple entry; no merge now. Revisit in Phase 3.

## Phase 3: one profile, synced with the CRM, about two to three weeks

- **Profile edits flow to Zoho.** Today a known record is only tagged, never changed. Rule to adopt: the Hub fills empty Zoho fields and never overwrites a filled one; conflicts are listed for staff.
- **Full verification inside the Hub.** The Portal's form (partner type, host agency, consortium, seller of travel licence, state) becomes a "Complete your profile" step asked when the advisor first raises a request. That is when payment rules matter: pay the host agency, check the licence in the states that require it. Reuse `agent_verifications` and `submit_verification()`; do not build a second form.
- **Host agencies as a list**, not free text, loaded from the CRM's host agency records, so "under host agency X" links to the real record.
- **Status flows back from Zoho to the Hub.** When staff move a request's stage in the CRM, "My requests" updates. Zoho change notifications expire, so a scheduled re-check runs alongside them.
- **Zoho Forms are not embedded for profile or requests.** A prefilled email in an embedded form does not prove who is submitting, so the Hub's own signed-in form writes to Zoho instead.
- **Measures shown to staff:** first request per new advisor, requests completed, time to proposal, proposal to booking, repeat advisors, requests with no owner or failed.
- Keiron to meet Ingrid on host agency, consortium and agent differences before this phase is designed in detail.

## Phase 4: to research, no dates

- **Zoho CRM Portals** (invoices, order status): an alternative to compare, not a required extra screen. It has its own login; single sign-on with the Hub needs SAML set up on the Zoho side, and a custom domain does not merge the two sessions.
- **Travefy**, in steps:
  1. Staff paste the proposal link on the request (Phase 2).
  2. Sample itineraries advisors can start from.
  3. The Travefy API creating trips. Per the ChatGPT analysis this is a paid licence, listed at $199 a month on an annual contract plus a Core subscription; to confirm with Travefy.
  4. Advisors editing.
  - Only the itinerary view can be embedded, not the builder.
  - A full detailed itinerary link shows every traveller's details to anyone who has the link, so only restricted views are shared.
- **Reading free-text requests with an AI model** to prefill the request fields for staff.
- **Facebook sign-in.**
- **Copy the Hub to other countries** once the Costa Rica base is settled.

## What is needed from people

| Who | What | For |
|---|---|---|
| Keiron | Zoho Self Client and `ZOHO_*` values; approve one test lead | Phase 0 |
| Keiron | Supabase production settings (link expiry, email limit, template) | Phase 0 |
| Keiron or Rohan | Zoho API name of the partner type field and its picklist values | 1.1 |
| Keiron | Google OAuth client | 1.2 |
| CRM owner | Request as Deal or Note; pipeline and stage; who is notified | Phase 2 |
| Ingrid | Session on host agency, consortium, agent | Phase 3 |
| Marilú, Bruce, María Paz | Use the signature block, QR and supplier-portal link | 1.5 |

## Risks

- **Which Hub is live?** The ChatGPT prompt links to `https://hub.travelxm.com/login`. Earlier notes say the Hub was not released. To confirm: which version is at that address and which database it uses. Everything here ships on top of that.
- Real Zoho is still untested; Phase 0's test lead is the first proof.
- Partner type values must match the CRM picklist exactly, or Zoho rejects the record.
- Staff-created accounts send email to addresses typed by staff: a typo emails a stranger. The same limits as the gift apply.

## Related files

- `docs/THANKSGIVING.md`: the gift page and how to connect Zoho.
- `docs/DEPLOY.md`: the production runbook.
