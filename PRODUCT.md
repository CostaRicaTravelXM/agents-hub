# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (responsive, installable as a PWA; phones are a first-class device)

## Users

Travel advisors at agencies in the US, Canada and Europe who sell Costa Rica trips to their own clients. They learn between client calls, often on a phone, and most are not technical: they should never have to guess what a button does or where they are.

TravelXM staff (content managers and admins) build courses and follow the numbers in the admin portal.

## Product Purpose

TravelXM Academy teaches advisors the Costa Rica destinations, hotels and experiences TravelXM sells, so they quote with confidence and sell more of it. Success means an advisor finishes a course, earns a certificate their clients can verify, and comes back for the next one.

## Positioning

Training written by the TravelXM team in San José, the operator that actually runs the trips, rather than a generic destination course. Every course ends in a certificate with a public verification code.

## Operating Context

- Advisors usually arrive through an invitation from TravelXM (email or a group invite link such as `/join/PARTNER27`). The landing page reassures them and gets them signed in or registered fast; signing in matters as much as signing up.
- Lessons are short videos, PDFs, documents, links, readings and quizzes. Modules can require earlier modules; progress saves across devices.
- Password changes go through an emailed reset link, never an in-page form. Email is sent by Supabase Auth (local: Mailpit; production SMTP to be configured later).

## Capabilities and Constraints

- Next.js 16 App Router, Supabase (Auth, Postgres with RLS), Cloudflare R2 media.
- Interface language: English only, written in plain words for non-technical readers.
- Roles: travel agent, content manager, admin.
- Price: the Academy is presented as free for travel advisors. This comes from the app's existing copy (register page, "Free for advisors who sell Costa Rica") and open registration; to be confirmed by TravelXM.

## Brand Commitments

- TravelXM Principal palette and type system from `../Branding/# TRAVEL XM · Sistema de diseño.md`, mapped in `DESIGN.md`. One palette per piece; the Premium palette is not used.
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
5. The Academy is one place: public pages, auth and the app share one look.

## Accessibility & Inclusion

WCAG 2.2 AA. Focus ring always visible, tap targets at least 44px, reduced-motion respected.
