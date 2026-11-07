# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (responsive, installable as a PWA; phones are a first-class device)

## Users

Travel advisors at agencies in the US, Canada and Europe who sell Costa Rica trips to their own clients, and independent advisors working on their own. Many are older. They use phones, iPads and small laptops, between client calls, and most are not technical: they should never have to guess what a button does or where they are, never need a gesture nobody told them about, and never read small type.

TravelXM staff (content managers and admins) build courses (masterclasses included), FAM trips, offers and books, and follow the numbers in the admin portal.

## Product Purpose

The TravelXM Agents Hub is the one place an advisor goes for everything TravelXM gives them: the Academy courses and certificates, masterclasses (courses in their own category), FAM trips, current offers, books and marketing assets, plus the door to the Agents Portal. Success means an advisor finds what they came for in one tap, finishes a course and earns a certificate their clients can verify, and tells TravelXM they want to come on a FAM trip.

## Positioning

Training written by the TravelXM team in San José, the operator that actually runs the trips, rather than a generic destination course. Every course ends in a certificate with a public verification code.

## Operating Context

- Advisors usually arrive through an invitation from TravelXM (email or a group invite link such as `/join/PARTNER27`). The landing page reassures them and gets them signed in or registered fast; signing in matters as much as signing up.
- Lessons are short videos, PDFs, documents, links, readings and quizzes. Modules can require earlier modules; progress saves across devices.
- Password changes go through an emailed reset link, never an in-page form. Email is sent by Supabase Auth (local: Mailpit; production SMTP to be configured later).

## Capabilities and Constraints

- Next.js 16 App Router, Supabase (Auth, Postgres with RLS), Cloudflare R2 media.
- Interface language: English only, written in plain words for non-technical readers.
- Roles: travel agent, content manager, admin. The database and the account are shared with the Agents Portal.
- Modules: Learning, FAM Trips, Current Offers, Books, Marketing Assets, Agents Portal (external), Profile. Phones and iPads show a bottom bar with Home, Learning, Trips, More and Profile, and no top bar.
- Marketing Assets reads the shared Google Drive folder with a server-only API key and shows it inside the Hub. Without the key, or when Google does not answer, the page links out to the folder.
- Interest forms are Zoho Forms shown inside the Hub with the advisor's details pre-filled; the lead is created in Zoho CRM after sign-up through n8n.
- Price: the Academy is presented as free for travel advisors. This comes from the app's existing copy (register page, "Free for advisors who sell Costa Rica") and open registration; to be confirmed by TravelXM.

## Brand Commitments

- TravelXM Principal palette from `../Branding/# TRAVEL XM · Sistema de diseño.md`, mapped in `DESIGN.md`, on a pure white page. One palette per piece; the Premium palette is not used.
- Departures from the brand manual, chosen by TravelXM for this audience: Be Vietnam Pro is the only interface font, and Anton stays on certificates. Main buttons use a darker green (`#507c13`) so white text passes contrast; brand lime `#70a91b` appears only in tints.
- Rhombus logo badge (min 56px), animal cut-outs (toucan, macaw, sloth, frog), tagline *Pura Vida*.
- The public landing page must look like the app inside, not like a separate marketing site.

## Evidence on Hand

- Seed photography of Costa Rica destinations in `public/photos/` (Wikimedia Commons, see `CREDITS.md`), to be replaced with TravelXM's own photos.
- Real course catalog, certificates and verification flow in the app.
- No testimonials, agent counts, sales figures or partner logos exist yet. Do not invent them.

## Product Principles

1. Plain words over clever ones. Every control says what it does.
2. Always show where the agent is and what to do next.
3. Phone first: every task works one-handed on a small screen with no sideways scrolling.
4. Security without friction: sensitive changes (password) go through email confirmation.
5. The Hub is one place: public pages, auth and the app share one look.
6. Big and obvious: 17px body on phones, 44px targets, a label under every icon, one primary action per screen, "opens in a new tab" said in words.

## Accessibility & Inclusion

WCAG 2.2 AA. Focus ring always visible, tap targets at least 44px, reduced-motion respected.
