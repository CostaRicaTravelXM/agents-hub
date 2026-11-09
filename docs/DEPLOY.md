# Putting the Agents Hub live

The steps in order, from this laptop to `hub.travelxm.com`. Each step says what to check before moving on. Steps marked **Stop** are where you send the output to Claude before going further.

What you will end up with:

| Piece | Where |
|---|---|
| Code | GitHub, `CostaRicaTravelXM/travelxm-agents-hub` (private) |
| App | Vercel, Pro plan, building from `main` |
| Database and sign-in | The Supabase project the Agents Portal already uses |
| Photos | Cloudflare R2 bucket `academy-public`, served by the Cloudflare CDN at `media.travelxm.com` |
| Videos and PDFs | Cloudflare R2 bucket `academy-private`, opened with short-lived signed links |
| Marketing Assets | Stays in Google Drive |

The order is slightly different from "GitHub, Vercel, images": Vercel needs the media address (`media.travelxm.com`) when it builds, so Cloudflare comes before Vercel.

---

## 1. GitHub

1. On github.com, in the **CostaRicaTravelXM** organization, create a new **private** repository named `travelxm-agents-hub`. Leave it empty: no README, licence or `.gitignore`.
2. In a terminal in this folder:

   ```bash
   git remote add origin https://github.com/CostaRicaTravelXM/travelxm-agents-hub.git
   git push -u origin backend
   git push origin backend:main
   ```

3. Check on GitHub that both branches are there and that **no `.env` file** appears in the file list (only `.env.example`, which holds no keys).

`main` is what goes live. Work continues on `backend`, and goes live when it is merged into `main`.

## 2. Cloudflare takes over travelxm.com's DNS

> **Done on 2026-11-09.** GoDaddy points at `santino` and `zara.ns.cloudflare.com`. All DigitalOcean records were copied, all DNS only, and every mail record (MX, SPF, DKIM, DMARC, Zoho verification) was checked to answer the same from Cloudflare as from DigitalOcean. Never proxy the mail records. The steps below stay as the record of how, and for undoing it.

This is the riskiest step: if a record is missed, email or a live site stops working. Do it on a quiet day, and keep the DigitalOcean records untouched until a week after the move.

1. **Export what exists.** In DigitalOcean, open Networking → Domains → `travelxm.com` and take a screenshot or copy of every record. Pay special attention to:
   - **MX** records (Zoho Mail)
   - **TXT** records: SPF (`v=spf1 …`), DMARC (`_dmarc`), Zoho verification, Google verification
   - **DKIM** records (often `zmail._domainkey` or similar)
   - **A** and **CNAME** records for every live site: the main site, `agents.travelxm.com` (the Portal today), and anything else
2. **Lower the TTL** of those records in DigitalOcean to 300 seconds, a day before the move, so a mistake can be undone quickly.
3. **Add the site to Cloudflare** (the Free plan is enough). Cloudflare scans and imports the records it can find.
4. **Compare record by record** with your export. Add anything missing. Then:
   - Mail records (MX, SPF, DKIM, DMARC): **DNS only** (grey cloud).
   - Records pointing at Vercel or other hosts: **DNS only** (grey cloud). Vercel asks for this.
5. **DNSSEC:** at the registrar where travelxm.com was bought, check whether DNSSEC is on. If it is, turn it off before changing nameservers, and turn it back on from Cloudflare afterwards.
6. **Change the nameservers** at the registrar to the two Cloudflare gives you.
7. **Check before continuing**, usually within an hour:
   - Cloudflare shows the domain as **Active**.
   - Send an email to and from an `@travelxm.com` address.
   - Open every live site.
   - `nslookup -type=ns travelxm.com` shows Cloudflare's nameservers.

**To undo:** set the nameservers back to `ns1.digitalocean.com`, `ns2.digitalocean.com` and `ns3.digitalocean.com` at the registrar. The old records are still in DigitalOcean.

## 3. Cloudflare R2 (photos and videos)

> **Steps 1 and 2 done on 2026-11-09:** both buckets exist, and `media.travelxm.com` serves `academy-public` over HTTPS. Continue at step 3.

1. In Cloudflare → R2, create two buckets: `academy-public` and `academy-private`.
2. Open `academy-public` → Settings → **Custom Domains** → add `media.travelxm.com`. Leave `academy-private` without any public access.
3. On **both** buckets, under Object lifecycle rules, make sure there is a rule that **aborts incomplete multipart uploads after 7 days**. Add it if missing. Big videos go up in parts, and a cancelled upload would otherwise leave its parts behind.
4. R2 → **Manage API tokens** → create a token with **Object Read & Write**, limited to those two buckets. Keep the Access Key ID and Secret somewhere safe. They are shown only once.
5. Note your **Account ID** (R2 overview page).
6. Create a file **outside this folder**, for example `C:\Users\Keiron\Desktop\hub-production.env`, with:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<from Supabase, step 4>
   R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   R2_REGION=auto
   R2_ACCESS_KEY_ID=<token key id>
   R2_SECRET_ACCESS_KEY=<token secret>
   R2_FORCE_PATH_STYLE=false
   R2_PRIVATE_BUCKET=academy-private
   R2_PUBLIC_BUCKET=academy-public
   STORAGE_CORS_ORIGINS=https://hub.travelxm.com,https://travelxm-agents-hub-git-main-<team>.vercel.app
   ```

   Keep it outside the project so it can never be committed, and so a local `next build` never picks it up.
7. Let the admin upload from the browser:

   ```bash
   node --env-file=C:/Users/Keiron/Desktop/hub-production.env scripts/setup-storage.mts
   ```

   It prints `CORS set for …` for each bucket. On R2 it skips creating buckets, which you did in step 1.

**How each file is served:**

| What | Bucket | Served |
|---|---|---|
| Course covers, posters, FAM trip, offer and book photos | `academy-public` | `media.travelxm.com`, cached by Cloudflare for a year |
| Lesson videos and files, resources, book, offer and FAM trip itinerary PDFs | `academy-private` | Signed links that expire, after the Hub checks the agent may see them |

Signed links can't go through a custom domain, so videos come straight from R2 rather than from Cloudflare's cache. Cloudflare also caches nothing over 512 MB on the Free, Pro and Business plans. Compress videos before uploading: 1080p, under 1 GB per video. If agents report buffering on phones, Cloudflare Stream is the next step.

## 4. Supabase (shared with the live Portal)

The Hub's database changes run against the same project as the live Agents Portal, including its agent accounts and quotes. Nothing here writes until the last line, and that line waits for a planned release window.

1. **Backup.** Supabase dashboard → Database → Backups: check there is a recent one. Also keep your own copy:

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db dump --linked -f ../portal-backup-schema.sql
   npx supabase db dump --linked --data-only -f ../portal-backup-data.sql
   ```

2. **See what would change.** This only reads:

   ```bash
   npx supabase migration list --linked
   npx supabase db push --linked --dry-run
   ```

3. **Stop.** Send Claude the output of step 2. These migrations change the `profiles` table that the live Portal reads, and the Portal live today runs the older code from its `main` branch. The real push therefore has to happen together with the Portal's `feat/unified-accounts` release, in one planned window.
4. In that window, and only then:

   ```bash
   npx supabase db push --linked
   ```

   No seed runs: `db push` only applies migrations. The demo seed also refuses to run against anything but this laptop.
5. **Check production holds only real data.** Supabase → SQL editor:

   ```sql
   select 'courses' as what, count(*) from courses
   union all select 'offers', count(*) from hub_offers
   union all select 'books', count(*) from hub_books
   union all select 'FAM trips', count(*) from hub_fam_trips
   union all select 'Marketing links', count(*) from hub_links
   union all select 'demo accounts', count(*) from auth.users
     where email like '%@example.com' or email like '%@travelxm.test' or email like '%@e2e.test';
   ```

   Expected: 0 courses, 0 offers, 0 books, 13 FAM trips, 1 Marketing link, 0 demo accounts. If anything else shows up, send it to Claude before deleting anything.
6. **Sign-in addresses.** Authentication → URL Configuration → Redirect URLs, add:
   - `https://hub.travelxm.com/auth/confirm`
   - `https://hub.travelxm.com/auth/callback`
   - `https://travelxm-agents-hub-git-main-<team>.vercel.app/**` (preview)

   The **Site URL** is shared with the Portal, so leave it as it is here (see section 7, step 3).
7. **SMTP:** Authentication → SMTP should already send from TravelXM for the Portal. Check that it does.

## 4b. Masterclasses (videos to R2, courses to Supabase)

The nine Greenroom videos from Drive (`Master Classes/Greenroom Videos`, GR01 to GR09) are already compressed for the web (1080p, about 2 to 3 Mbit/s) and sit in `C:\Users\Keiron\Desktop\TravelXM Learning\masterclass-media\`, one folder per episode with `web.mp4`, `poster.jpg`, `duration.txt` and the transcript. The course text and quizzes are in `scripts/masterclasses.mts`.

1. **Videos to R2.** Needs step 3 done. Shows the plan first, then uploads with `--yes`. Re-running skips what is already there.

   ```bash
   node --env-file=C:/Users/Keiron/Desktop/hub-production.env scripts/import-masterclasses.mts upload --media "C:/Users/Keiron/Desktop/TravelXM Learning/masterclass-media"
   node --env-file=C:/Users/Keiron/Desktop/hub-production.env scripts/import-masterclasses.mts upload --media "C:/Users/Keiron/Desktop/TravelXM Learning/masterclass-media" --yes
   ```

   It writes `scripts/masterclasses-media.json` (the storage keys). Commit that file. The keys come from the file contents, so the same videos give the same keys locally and in production.
2. **Courses to Supabase.** Needs step 4's `db push` done. Creates one course per masterclass: the video, an 8-question quiz (80% to pass) and a certificate.

   ```bash
   node --env-file=C:/Users/Keiron/Desktop/hub-production.env scripts/import-masterclasses.mts apply
   node --env-file=C:/Users/Keiron/Desktop/hub-production.env scripts/import-masterclasses.mts apply --yes
   ```

   New courses are saved as **drafts**. Check them in Admin → Courses, then publish from there, or run the last command again with `--publish`. Re-running updates the courses in place: agents keep their progress and certificates.
3. The check query in step 4.5 now shows 9 courses.

To change a course's text or quiz later, edit `scripts/masterclasses.mts` and run step 2 again. To add an episode (GR10 …), add its folder to `masterclass-media` and an entry to `scripts/masterclasses.mts`, then run both steps.

## 5. Vercel

1. Use a **Pro** team. Hobby is for non-commercial use only.
2. Add New → Project → import `CostaRicaTravelXM/travelxm-agents-hub`. Framework: Next.js. Root directory: the repository root. Production branch: `main`.
3. Settings → General → **Node.js version 24.x**, the same as this laptop.
4. Settings → Environment Variables. Set these for **Production** and **Preview**:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_APP_URL` | `https://hub.travelxm.com` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key. **Secret** |
   | `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` | `.travelxm.com`, which shares the sign-in with the Portal |
   | `NEXT_PUBLIC_GOOGLE_AUTH` | `true` only if Google sign-in is set up in Supabase |
   | `NEXT_PUBLIC_AGENTS_PORTAL_URL` | `https://agents.travelxm.com` (the Portal keeps its address) |
   | `AUTH_RECOVERY_SECRET` | A long random string: `openssl rand -base64 32`. **Secret** |
   | `GOOGLE_DRIVE_API_KEY` | The Drive key, restricted to the Drive API. **Secret**, never `NEXT_PUBLIC_` |
   | `N8N_AGENTS_WEBHOOK_URL` | The n8n "TravelXM — Agents Hub" webhook. **Production only**: leave it empty in Preview so test sign-ups don't create Zoho leads |
   | `R2_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
   | `R2_REGION` | `auto` |
   | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | The R2 token. **Secret** |
   | `R2_FORCE_PATH_STYLE` | `false` |
   | `R2_PRIVATE_BUCKET`, `R2_PUBLIC_BUCKET` | `academy-private`, `academy-public` |
   | `NEXT_PUBLIC_MEDIA_URL` | `https://media.travelxm.com` |

   Variables starting with `NEXT_PUBLIC_` are baked in when Vercel builds. After changing one, redeploy.
5. Deploy. The first build makes a **preview** at a `vercel.app` address. Preview uses the live database, so anything you do there is real.

## 6. Test the preview on real devices

On a real iPhone, a real iPad and a laptop, signed in as a test agent:

- [ ] FAM trip → **Register interest**: the form scrolls all the way to **Submit** with a finger (send one test, then delete that lead in Zoho)
- [ ] Marketing Assets: folders open, a photo previews, a PDF previews, a video plays
- [ ] Learning: once a course with a video exists, the video plays and the lesson completes
- [ ] Books: once the Golf Magazine is added (section 7, step 6), it opens and the reader turns pages
- [ ] Certificates: the certificate PDF downloads, with the toucan, and its QR code opens the verify page on a phone
- [ ] As admin: upload a course cover photo, then a video over 100 MB, and both save
- [ ] `curl -sI https://media.travelxm.com/<a photo key>` twice: the second answer says `cf-cache-status: HIT`

## 7. Go live

1. **Move the FAM trip photos to R2.** First a dry run, which only lists what it would do:

   ```bash
   node --env-file=C:/Users/Keiron/Desktop/hub-production.env scripts/move-public-photos.mts
   ```

   If the list shows the 13 trips, run it for real:

   ```bash
   node --env-file=C:/Users/Keiron/Desktop/hub-production.env scripts/move-public-photos.mts --apply
   ```

   Running it again is safe: it only touches trips whose photo still points at `/photos/`.
2. **First admin.** If your account already exists from the Portal, in the SQL editor:

   ```sql
   update profiles set role = 'admin' where email = 'you@travelxm.com';
   ```

3. **Domain.** The Hub lives at `hub.travelxm.com`; the Portal keeps `agents.travelxm.com`. The DNS record is already in Cloudflare (CNAME `hub` → `cname.vercel-dns.com`, DNS only).
   1. In the Hub's Vercel project → Settings → Domains, add `hub.travelxm.com`. Vercel finds the record and issues the certificate.
   2. In Supabase, decide the Site URL together with the Portal's release: it is the fallback address in every sign-in email for both apps. The Hub's own links never depend on it, because they come from `NEXT_PUBLIC_APP_URL`.
4. **n8n:** in the "TravelXM — Agents Hub" workflow, point the welcome email’s button at `https://hub.travelxm.com/login` and remove the old `Sign Access Link` step.
5. **TravelXM Front:** set `NEXT_PUBLIC_AGENTS_HUB_URL=https://hub.travelxm.com`, then deploy it so `/agents` sends visitors to the Hub.
6. **The Golf Magazine.** In `/admin/books/new`: title "Costa Rica Golf Magazine 2026–2027", author "Travel XM", description "Where golf meets paradise: 5 tournaments, 15 courses and 6 resorts across Costa Rica." Upload `news/Costa Rica Golf Magazine by Travel XM optimized.pdf` as the PDF and `news/Costa Rica Golf Magazine cover.jpg` as the cover (both in the `TravelXM Learning` folder), set it to Published, save, then press **Prepare pages** until every page is ready.
7. Add the rest of the real content in `/admin`: courses (including the Masterclasses category), offers, FAM trip itinerary PDFs, and the agency groups for group-only trips (`/admin/groups`, one group per agency).

## Before launch: your decisions

- **Next.js in the Portal and Front.** The Hub runs 16.4.5. The Portal (16.3.1) and Front (16.2.1) still use versions with a critical security advisory.
- **Photo rights.** `public/photos/CREDITS.md` lists Wikimedia Commons photos. CC BY-SA ones need a visible credit, and the FAM trip photos' source isn't recorded. Replace them with TravelXM's own photos, or confirm the rights.
- **Google key.** In Google Cloud, restrict the Drive key to the Drive API.
- **Client photos.** Every agent can see `999_Clients pictures & videos` in Marketing Assets, and those Drive files are public to anyone with the link.
- **Zoho form banner.** At phone width the form's own banner breaks "Upcoming FAM Trips" into pieces. Fix it in Zoho Forms (theme, header text size).
