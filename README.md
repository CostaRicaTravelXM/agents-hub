# TravelXM Academy

The TravelXM learning platform for travel advisors (Phase 1). Agents register, take Costa Rica destination courses built from videos, PDFs, documents, links, readings and quizzes, unlock modules in order, and earn verifiable certificates. TravelXM staff build courses, restrict them to groups and follow the Phase 1 success metrics from an admin portal.

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

1. **Supabase:** create a project, then `npx supabase link --project-ref <ref>` and `npx supabase db push`. In Authentication, set the Site URL to your domain and add `https://<domain>/auth/confirm` and `https://<domain>/auth/callback` to the redirect URLs. Configure SMTP (for example Resend) so confirmation and reset emails come from TravelXM. For Google sign-in, enable the Google provider and set `NEXT_PUBLIC_GOOGLE_AUTH=true`.
2. **Cloudflare R2:** create `academy-private` and `academy-public`, and give the public bucket a custom domain such as `media.travelxm.com`. Create an API token with object read and write access. Then run `npm run storage:setup` with the production variables to apply CORS for your domain.
3. **Hosting (Vercel or any Node host):** set the variables from `.env.example`, with `R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, `R2_FORCE_PATH_STYLE=false` and `NEXT_PUBLIC_MEDIA_URL=https://media.travelxm.com`.
4. **First admin:** register normally, then in the Supabase SQL editor run `update profiles set role = 'admin' where email = 'you@travelxm.com';`.

Do not run `npm run seed` against production. It creates demo accounts.

## Project map

```
app/(auth)            sign in, register, password reset
app/(app)             agent area: dashboard, courses, modules, progress, resources, certificates, profile
app/learn             lesson player (video, PDF, document, link, reading, quiz)
app/admin             CMS, groups, agents, analytics
app/api               progress heartbeat, signed media, uploads, certificates PDF, CSV exports
app/actions           server actions (auth, learning, profile, admin)
components/ui         brand primitives (Button, inputs, Card, Badge, Tag, Tabs, Dialog, Toast, Tooltip…)
components/learning   player, quiz runner, syllabus, cards, charts
components/admin      course builder, lesson and quiz editors, uploader
lib                   Supabase clients, auth, queries, storage, certificate PDF
supabase/migrations   schema, access control, progress engine, metrics
supabase/tests        pgTAP tests
scripts               storage setup, demo seed, screenshot helper
styles/tokens.css     design tokens from the branding file
```

## Notes and known limits

- The stack follows the Phase 1 document, with two deliberate deviations. Radix primitives styled to the brand replace shadcn/ui, which uses the same primitives underneath. Server Components and Server Actions replace React Query and Zustand, since no client-side cache is needed.
- Videos are progressive MP4 served from R2. If adaptive bitrate becomes necessary, `video_key` can point to Cloudflare Stream without schema changes.
- Seed photography is Commons-licensed (see `public/photos/CREDITS.md`). Replace it with TravelXM's own photography before launch. The demo videos are generated from those photos.
