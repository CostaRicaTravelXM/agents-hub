# TravelXM Agents Hub

The one place TravelXM gives travel advisors. One account (shared with the Agent Portal) opens:

| Module | What it is | Where |
| --- | --- | --- |
| Learning | The Academy: Costa Rica courses with videos, PDFs, readings and quizzes, module locks, progress and verifiable certificates. Masterclasses are courses in their own category; a video lesson can be an upload or a Google Drive or Wistia link | `/courses`, `/progress`, `/certificates`, `/resources`, `/learn/…` |
| FAM Trips | The familiarisation programme; each trip opens a detail page and an interest form (Zoho Forms, pre-filled) | `/fam-trips` |
| Current Offers | Promotions with start and end dates, an optional PDF, link or interest form | `/offers` |
| Books | PDF guides read page by page in a page-turn reader; pages are rendered on the server | `/books`, `/read/…` |
| Marketing Assets | The shared Google Drive folder inside the Hub: subfolders, thumbnails, search, preview and download. Links out when `GOOGLE_DRIVE_API_KEY` is empty or Google does not answer | `/marketing/…` |
| Agents Portal | External app at `NEXT_PUBLIC_AGENTS_PORTAL_URL`, same session cookie | nav entry |

Staff manage every module from `/admin`. Registration asks for first name, last name, email, password (or a sign-in link, or Google), an optional agency and an "I am a solo or independent agent" box. After the first sign-in the Hub sends the lead once to the n8n "TravelXM — Agents Hub" workflow (`N8N_AGENTS_WEBHOOK_URL`), which creates it in Zoho CRM.

The audience is often older and on phones or iPads: a bottom bar with five labelled tabs (Home, Learning, Trips, More, Profile) and no top bar on phones and iPads, module tiles on Home, 17px body text, 44px+ targets, visible labels under every icon, and the page turn in the reader is the one motion that is longer than the brand's 340ms.

- **Frontend:** Next.js 16 (App Router, React 19, TypeScript), Tailwind CSS 4 mapped to the TravelXM design system, Radix primitives, Lucide icons.
- **Backend:** Supabase (Auth, Postgres with row-level security, a progress engine in SQL functions and triggers).
- **Media:** Cloudflare R2 through the S3 API. Videos and documents are private and served with short-lived signed URLs. Locally, [RustFS](https://github.com/rustfs/rustfs) plays the part of R2.

## Run it locally

Requirements: Node 20.9+, Docker Desktop, ffmpeg (only for generating the demo videos in the seed).

```bash
npm install
npm run db:start                 # Supabase in Docker, applies supabase/migrations
npm run storage:start            # RustFS on :9000 (S3 API) and :9001 (console)
cp .env.example .env.local       # then paste ANON_KEY and SERVICE_ROLE_KEY from `npx supabase status`
npm run storage:setup            # buckets, public-read policy, CORS
npm run seed                     # demo accounts, 8 courses, media, 10 weeks of activity
npm run dev                      # http://localhost:3000
```

Demo accounts (password `Academy2026!`):

| Role | Email |
| --- | --- |
| Admin | admin@travelxm.test |
| Content manager | content@travelxm.test |
| Travel agent | agent@travelxm.test |

The partner group invite link is `/join/PARTNER27`. Local email (confirmations, password resets) is captured by Mailpit at http://127.0.0.1:54324.

To start over: `npm run db:reset && npm run seed`.

## Tests

```bash
npm run typecheck
npx eslint .
npm test              # Vitest unit tests
npm run test:db       # pgTAP: access rules, module locks, progress, quizzes, certificates (36 tests)
npm run test:e2e      # Playwright against the running local stack (uses installed Chrome)
```

## How it works

### Roles and access

| Role | Can do |
| --- | --- |
| Travel agent | Take courses they can see, track progress, earn certificates |
| Content manager | Everything in the course CMS and analytics |
| Admin | All of the above, plus groups, members and roles |

Registration is open. A course is visible to **every agent** or only to **selected groups**. Agents join a group through its invite link (`/join/CODE`) or an admin adds them by email. All of this is enforced by row-level security in Postgres (`supabase/migrations/20260924000002_access.sql`), not only in the UI.

### Module requirements

A module can require other modules of the same course. It stays locked until every required lesson of those modules is complete. Circular requirements are rejected by a trigger. Locked lessons cannot be opened, cannot record progress, and never get a media URL.

### Progress engine

All learner writes go through `security definer` functions (`supabase/migrations/20260924000003_progress.sql`):

- `start_lesson` enrolls the agent and records the visit.
- `record_progress` is the player heartbeat (every 10 s, plus pause and leave). Watch percentage is measured from the seconds actually played, so skipping to the end does not count. It only ratchets up, and learning time is capped per heartbeat.
- A video completes at its **required completion percentage** (90% by default, set per lesson). PDFs, documents, links and readings are completed by the agent. Quizzes complete when passed.
- `submit_quiz` grades on the server. The answer key never reaches the browser, and it is revealed only after a pass or the last attempt.
- A trigger rolls lesson progress up to the enrollment. At 100% it completes the course and issues a certificate with a code anyone can check at `/verify/CODE`.

### Password changes go through email

Agents never change a password from an in-page form. From the profile page (or "Forgot your password?" on sign-in) they ask for a link, and Supabase Auth emails it:

1. `requestPasswordReset` / `sendMyPasswordResetLink` (`app/actions/auth.ts`) call `resetPasswordForEmail`.
2. The email (`supabase/templates/recovery.html`) links to `/auth/confirm?token_hash=…&type=recovery`. A token hash, unlike the default PKCE link, works on any device, so an agent can ask on a laptop and open the email on a phone.
3. `/auth/confirm` verifies the token, signs the agent in and sets a signed, 15-minute `xm_recovery` cookie (`lib/recovery.ts`).
4. `/reset-password` shows the new-password form only while that cookie is valid. Saving clears it and signs out every other session. Supabase then sends the "password changed" notice (`supabase/templates/password-changed.html`).

Locally, Mailpit at http://127.0.0.1:54324 captures these emails. After editing `supabase/config.toml` or the templates, restart with `npx supabase stop && npm run db:start`.

**Before launch:** configure SMTP in the Supabase project (Authentication, Emails, SMTP Settings), or fill `SMTP_*` in `.env` and uncomment `[auth.email.smtp]` in `supabase/config.toml`. Then upload the two templates, set their subjects, and set `AUTH_RECOVERY_SECRET`.

### Analytics (Phase 1 success metrics)

`admin_overview()` and `course_funnel()` in `supabase/migrations/20260924000004_metrics.sql` power the admin overview:

| Metric | Source |
| --- | --- |
| Registered agents | `profiles` with role agent |
| Course enrollments | `enrollments` |
| Completion rate | completed / enrolled |
| Learning time | `learning_time_daily`, fed by the player heartbeat |
| Most viewed content and destinations | `learning_events` (course views, lesson starts) |
| Drop-off points | first incomplete required lesson of each unfinished enrollment |
| Certified agents | distinct agents with a certificate |

Staff accounts are excluded from every number. The agents and enrollments lists export to CSV.

## Deploying to production

Follow [docs/DEPLOY.md](docs/DEPLOY.md), step by step: GitHub, Cloudflare DNS and R2, the shared Supabase project, Vercel, a device checklist, and going live.

Two rules hold throughout:
- **Production starts with real data only.** Migrations bring the 13 FAM trips, the Marketing link and the Masterclasses category; everything else is added in `/admin`. `npm run seed` creates demo accounts and courses, and refuses to run unless Supabase and storage are both local.
- **Keys stay on the server.** Only variables starting with `NEXT_PUBLIC_` reach the browser, and none of them is a secret.

## Project map

```
app/(auth)            sign in, register, password reset
app/(app)             the Hub: dashboard (Home tiles), (learning)/ courses, progress, certificates, resources,
                      fam-trips, offers, books, marketing, profile
app/learn             lesson player (video, PDF, document, link, reading, quiz)
app/read              book reader, outside the shell so the page fills a phone screen
app/admin             CMS: courses, categories, groups, agents, FAM trips, offers, books, links
app/api               progress heartbeat, signed media, uploads, certificates PDF, CSV exports, hub media and book pages
app/actions           server actions (auth, learning, profile, admin, hub-admin)
components/shell      app shell, nav-config (the single list every nav reads), sidebar, bottom tabs, More sheet
components/hub        module tile, media card, detail hero and layout, sticky CTA, interest page, Drive browser
components/books      the page-turn reader
components/ui         brand primitives (Button, inputs, Card, Badge, Tag, Tabs, Dialog, Toast, Tooltip…)
components/learning   player, quiz runner, syllabus, cards, charts
components/admin      course builder, lesson and quiz editors, hub forms, uploader
lib                   Supabase clients, auth, queries, storage, certificate PDF; lib/hub (queries, CTA pre-fill,
                      CRM hand-off, book page rendering), lib/books (reader page math)
supabase/migrations   schema, access control, progress engine, metrics, hub tables
supabase/tests        pgTAP tests
scripts               storage setup, demo seed, screenshot helper
styles/tokens.css     design tokens from the branding file; styles/reader.css the reader
```

### Books

A book is a PDF in the private bucket. `/api/hub/books/[id]/page/[n]?w=800|1600` renders the page the first time it is requested (`pdf-to-img` + `sharp`, server side), stores the WebP next to the PDF under `books/{id}/v{version}/`, and serves it with a one-year cache. The reader (`components/books/reader`) never loads pdf.js: it shows plain images, turns pages with a CSS 3D leaf driven by pointer events, and also offers Previous/Next buttons, a slider, "Go to page", keyboard keys and a "Larger text" mode. Position is kept in `localStorage` and in `hub_book_progress`. Saving a book runs the PDF inspection (page count and shape); "Re-check PDF" in the admin form repeats it, and "Prepare pages" renders every page ahead of time so the first reader does not wait.

### Interest forms

FAM trips and offers can carry a Zoho Forms link. The Hub shows the form inside the page (`/fam-trips/[slug]/interest`) with the advisor's name and email pre-filled; the pre-fill is only applied when the link points at `forms.zohopublic.com`. A native form posting to n8n can replace it later without a schema change.

## Notes and known limits

- The stack follows the Phase 1 document, with two deliberate deviations. Radix primitives styled to the brand replace shadcn/ui, which uses the same primitives underneath. Server Components and Server Actions replace React Query and Zustand, since no client-side cache is needed.
- Videos are progressive MP4 served from R2 through signed links, which Cloudflare does not cache, so compress them before uploading (1080p, under 1 GB). Files over 100 MB upload in parts, three at a time with retries. Cloudflare Stream would add adaptive quality, but needs its own upload path and player.
- Admin photos are uploaded with a one-year immutable `Cache-Control`; every upload gets a new key, so a replaced photo never shows stale.
- Seed photography is Commons-licensed (see `public/photos/CREDITS.md`). Replace it with TravelXM's own photography before launch. The demo videos are generated from those photos.
