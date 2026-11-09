# Putting the Agents Hub live

The steps in order, from this laptop to `hub.travelxm.com`. The Hub stands on its own: its own Supabase project, its own accounts, nothing shared with the Agents Portal. Each step says what to check before moving on. Steps marked **Stop** are where you send the output to Claude before going further.

| Piece | Where | Status |
|---|---|---|
| Code | GitHub, `CostaRicaTravelXM/agents-hub` (private), branches `main` and `backend` | Done |
| DNS | Cloudflare (moved from DigitalOcean) | Done |
| Photos | R2 bucket `academy-public`, served by the Cloudflare CDN at `media.travelxm.com` | Bucket and domain done, access key to do |
| Videos and PDFs | R2 bucket `academy-private`, opened with short-lived signed links | Bucket done, access key to do |
| Database and sign-in | New Supabase project `agents-hub` (TravelXM organization, East US) | To do |
| App | Vercel, building from `main`, at `hub.travelxm.com` | To do |
| Marketing Assets | Stays in Google Drive | Nothing to move |

---

## 1. GitHub (done)

`https://github.com/CostaRicaTravelXM/agents-hub`, pushed as the CostaRicaTravelXM account. `main` is what goes live. Work continues on `backend`, and goes live when it is merged into `main`.

## 2. Cloudflare DNS (done on 2026-11-09)

GoDaddy points at `santino` and `zara.ns.cloudflare.com`. Every DigitalOcean record was copied and is **DNS only** (grey cloud), and every mail record (MX, SPF, DKIM, DMARC, Zoho verification) answers the same from Cloudflare as it did from DigitalOcean.

- **Never proxy the mail records.** Proxy and DNS changes are for websites only.
- The Vercel sites stay DNS only as well; Vercel asks for that.
- `hub` is a CNAME to `cname.vercel-dns.com` (DNS only), ready for step 6.
- **To undo the move:** set the nameservers back to `ns1`, `ns2` and `ns3.digitalocean.com` at GoDaddy. The old records are still in DigitalOcean.

## 3. Cloudflare R2

Done: buckets `academy-public` and `academy-private`, and `media.travelxm.com` serving `academy-public` over HTTPS. `academy-private` has no public access and must keep it that way.

1. On **both** buckets → Settings → Object lifecycle rules: check there is a rule that **aborts incomplete multipart uploads after 7 days**. Add it if missing. Big videos go up in parts, and a cancelled upload would otherwise leave its parts behind.
2. R2 → **Manage API tokens** → create a token with **Object Read & Write**, limited to those two buckets. The secret is shown only once.
3. Create `C:\Users\Keiron\Desktop\hub-production.env`, **outside this folder** so it can never be committed:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<step 4.6>
   R2_ENDPOINT=https://2c23fa1b32d3467b7c95b6855bbbf3d0.r2.cloudflarestorage.com
   R2_REGION=auto
   R2_ACCESS_KEY_ID=<token key id>
   R2_SECRET_ACCESS_KEY=<token secret>
   R2_FORCE_PATH_STYLE=false
   R2_PRIVATE_BUCKET=academy-private
   R2_PUBLIC_BUCKET=academy-public
   STORAGE_CORS_ORIGINS=https://hub.travelxm.com,https://<the Vercel preview address>
   ```

4. Let the admin upload from the browser:

   ```bash
   node --env-file=C:/Users/Keiron/Desktop/hub-production.env scripts/setup-storage.mts
   ```

   It prints `CORS set for …` for each bucket. Run it again whenever `STORAGE_CORS_ORIGINS` changes.

**How each file is served:**

| What | Bucket | Served |
|---|---|---|
| Course covers, posters, FAM trip, offer and book photos | `academy-public` | `media.travelxm.com`, cached by Cloudflare for a year |
| Lesson videos and files, resources, book, offer and FAM trip itinerary PDFs | `academy-private` | Signed links that expire, after the Hub checks the agent may see them |

Videos and PDFs come straight from R2, not from Cloudflare's cache: signed links can't go through a custom domain, and Cloudflare caches nothing over 512 MB on the Free to Business plans. R2 charges nothing for downloads. If agents report buffering on phones, Cloudflare Stream is the next step.

## 4. Supabase: the new project

1. **Create it.** supabase.com → TravelXM organization → New project:
   - Name `agents-hub`, compute Micro, region **East US (North Virginia)** (next to Vercel's default region and the R2 buckets)
   - Keep **Enable Data API** and **Automatically expose new tables** ticked: the migrations rely on the default table grants, and every table has its own row-level security
   - **Generate a password** and keep it in a password manager. The CLI asks for it in the next step.
2. **Create the database.** In a terminal in this folder:

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push --linked --dry-run
   npx supabase db push --linked
   ```

   The project ref is the part before `.supabase.co` in the Project URL. `db push` only applies migrations. The demo seed refuses to run against anything but this laptop.
3. **Check it holds only real data.** SQL editor:

   ```sql
   select 'courses' as what, count(*) from courses
   union all select 'offers', count(*) from hub_offers
   union all select 'books', count(*) from hub_books
   union all select 'FAM trips', count(*) from hub_fam_trips
   union all select 'Marketing links', count(*) from hub_links
   union all select 'accounts', count(*) from auth.users;
   ```

   Expected: 0 courses, 0 offers, 0 books, 13 FAM trips, 1 Marketing link, 0 accounts. **Stop** if anything else shows up.
4. **Sign-in addresses.** Authentication → URL Configuration:
   - Site URL: `https://hub.travelxm.com`
   - Redirect URLs: `https://hub.travelxm.com/**` and, once Vercel exists, the preview address followed by `/**`
5. **Sign-in rules.** Authentication → Sign In / Providers → Email, to match `supabase/config.toml`:
   - Confirm email: on
   - Secure password change: on
   - Minimum password length: 8
   - Email OTP expiry: 3600 seconds
6. **Keys.** Settings → API Keys: copy the Project URL, the anon key and the service_role key (**secret**) into `hub-production.env` and, in step 6, into Vercel.
7. **Email sending (SMTP).** Supabase's built-in email sends only a few messages an hour, and only to team members, so sign-up and password emails need TravelXM's own SMTP. Authentication → Emails → SMTP Settings:
   - Host `smtp.zoho.com`, port `465`
   - Username: the Zoho mailbox that sends, for example `no-reply@travelxm.com`; password: an **app password** for that mailbox (Zoho Mail → Security → App passwords)
   - Sender name `TravelXM`, sender email the same mailbox
   - Then Authentication → Rate Limits: emails per hour **30**
8. **Email templates.** Authentication → Emails → Templates. Paste each file's HTML and set the subject:

   | Template | Subject | File |
   |---|---|---|
   | Confirm sign up | Confirm your TravelXM account | `supabase/templates/confirmation.html` |
   | Reset password | Reset your TravelXM password | `supabase/templates/recovery.html` |
   | Magic link | Your TravelXM sign-in link | `supabase/templates/magic-link.html` |
   | Password changed (Security notifications, turn it on) | Your TravelXM password was changed | `supabase/templates/password-changed.html` |

9. **Google sign-in** (optional): Authentication → Sign In / Providers → Google, with a Google OAuth client. Only then set `NEXT_PUBLIC_GOOGLE_AUTH=true` in step 6.

## 5. Masterclasses: videos to R2, courses to Supabase

The nine Greenroom videos (Drive: `Master Classes/Greenroom Videos`, GR01 to GR09) are compressed to 1080p for the web and transcribed. When all nine are done, they go in `C:\Users\Keiron\Desktop\TravelXM Learning\masterclass-media\`, one folder per episode with `web.mp4`, `poster.jpg`, `duration.txt` and the transcript. The course text and quizzes are in `scripts/masterclasses.mts`, one entry per episode.

1. **Videos to R2.** Needs step 3 done. Shows the plan first, then uploads with `--yes`. Re-running skips what is already there.

   ```bash
   node --env-file=C:/Users/Keiron/Desktop/hub-production.env scripts/import-masterclasses.mts upload --media "C:/Users/Keiron/Desktop/TravelXM Learning/masterclass-media"
   node --env-file=C:/Users/Keiron/Desktop/hub-production.env scripts/import-masterclasses.mts upload --media "C:/Users/Keiron/Desktop/TravelXM Learning/masterclass-media" --yes
   ```

   It writes `scripts/masterclasses-media.json` (the storage keys). Commit that file.
2. **Courses to Supabase.** Needs step 4 done. Creates one course per masterclass: the video, an 8-question quiz (80% to pass) and a certificate.

   ```bash
   node --env-file=C:/Users/Keiron/Desktop/hub-production.env scripts/import-masterclasses.mts apply
   node --env-file=C:/Users/Keiron/Desktop/hub-production.env scripts/import-masterclasses.mts apply --yes
   ```

   New courses are saved as **drafts**. Check them in Admin → Courses, then publish from there, or run the last command again with `--publish`. Re-running updates the courses in place: agents keep their progress and certificates.

To change a course's text or quiz later, edit `scripts/masterclasses.mts` and run step 2 again. To add an episode (GR10 …), add its folder to `masterclass-media` and an entry to `scripts/masterclasses.mts`, then run both steps.

## 6. Vercel

1. Use a **Pro** team. Hobby is for non-commercial use only.
2. Add New → Project → import `CostaRicaTravelXM/agents-hub`. Framework: Next.js. Root directory: the repository root. Production branch: `main`.
3. Settings → General → **Node.js version 24.x**, the same as this laptop.
4. Settings → Environment Variables, for **Production** and **Preview**:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_APP_URL` | `https://hub.travelxm.com` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL (step 4.6) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key. **Secret** |
   | `NEXT_PUBLIC_GOOGLE_AUTH` | `true` only if step 4.9 is done, otherwise `false` |
   | `AUTH_RECOVERY_SECRET` | A long random string: `openssl rand -base64 32`. **Secret** |
   | `GOOGLE_DRIVE_API_KEY` | The Drive key, restricted to the Drive API. **Secret**, never `NEXT_PUBLIC_` |
   | `N8N_AGENTS_WEBHOOK_URL` | The n8n "TravelXM — Agents Hub" webhook. **Production only**: leave it empty in Preview so test sign-ups don't create Zoho leads |
   | `R2_ENDPOINT` | `https://2c23fa1b32d3467b7c95b6855bbbf3d0.r2.cloudflarestorage.com` |
   | `R2_REGION` | `auto` |
   | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | The R2 token. **Secret** |
   | `R2_FORCE_PATH_STYLE` | `false` |
   | `R2_PRIVATE_BUCKET`, `R2_PUBLIC_BUCKET` | `academy-private`, `academy-public` |
   | `NEXT_PUBLIC_MEDIA_URL` | `https://media.travelxm.com` |

   Leave `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` and `NEXT_PUBLIC_AGENTS_PORTAL_URL` unset: the Hub shares no sign-in with the Portal, and the Portal entry stays hidden. Variables starting with `NEXT_PUBLIC_` are baked in when Vercel builds, so redeploy after changing one.
5. Deploy. The first build makes a preview at a `vercel.app` address. Add that address to the Supabase redirect URLs (step 4.4) and to `STORAGE_CORS_ORIGINS` (run step 3.4 again).
6. Settings → Domains → add `hub.travelxm.com`. The DNS record already exists, so Vercel only issues the certificate.

The preview and production use the same database and buckets, so anything done on the preview is real.

## 7. First admin and content

1. **First admin.** Sign up at `https://hub.travelxm.com/register` with your TravelXM email, confirm it from the email (this also proves SMTP works), then in the Supabase SQL editor:

   ```sql
   update profiles set role = 'admin' where email = 'you@travelxm.com';
   ```

2. **FAM trip photos to R2.** The 13 trips from the database setup still point at photos inside the app. Dry run first, which only lists what it would do:

   ```bash
   node --env-file=C:/Users/Keiron/Desktop/hub-production.env scripts/move-public-photos.mts
   node --env-file=C:/Users/Keiron/Desktop/hub-production.env scripts/move-public-photos.mts --apply
   ```

   Running it again is safe: it only touches trips whose photo still points at `/photos/`.
3. **Masterclasses:** step 5.2 if not done yet, then publish them.
4. **The Golf Magazine.** In `/admin/books/new`: title "Costa Rica Golf Magazine 2026–2027", author "Travel XM", description "Where golf meets paradise: 5 tournaments, 15 courses and 6 resorts across Costa Rica." Upload `news/Costa Rica Golf Magazine by Travel XM optimized.pdf` as the PDF and `news/Costa Rica Golf Magazine cover.jpg` as the cover (both in the `TravelXM Learning` folder), set it to Published, save, then press **Prepare pages** until every page is ready.
5. The rest in `/admin`: FAM trip dates and itinerary PDFs, offers, and the agency groups for group-only trips (`/admin/groups`, one group per agency; each group's invite link is how its agents join).

## 8. Test on real devices

On a real iPhone, a real iPad and a laptop, signed in as a test agent (a second account, not the admin):

- [ ] Sign up, confirm the email, sign out, reset the password: every email arrives and its button works
- [ ] FAM trip → **Register interest**: the form scrolls all the way to **Submit** with a finger (send one test, then delete that lead in Zoho)
- [ ] A group-only trip: the details and itinerary open, the form does not (unless the test agent is in the group)
- [ ] Marketing Assets: folders open, a photo previews, a PDF previews, a video plays
- [ ] Learning: a masterclass video plays, the quiz passes, the lesson completes
- [ ] Books: the Golf Magazine opens and the reader turns pages
- [ ] Certificates: the certificate PDF downloads, with the toucan, and its QR code opens the verify page on a phone
- [ ] As admin: upload a course cover photo, then a video over 100 MB, and both save
- [ ] `curl -sI https://media.travelxm.com/<a photo key>` twice: the second answer says `cf-cache-status: HIT`

## 9. Go live

1. **n8n:** in the "TravelXM — Agents Hub" workflow, point the welcome email's button at `https://hub.travelxm.com/login` and remove the old `Sign Access Link` step. Check `N8N_AGENTS_WEBHOOK_URL` is set in Vercel Production.
2. **TravelXM Front:** set `NEXT_PUBLIC_AGENTS_HUB_URL=https://hub.travelxm.com`, then deploy it so `/agents` sends visitors to the Hub.
3. Invite the agencies: send each group's invite link.

## Before launch: your decisions

- **Photo rights.** `public/photos/CREDITS.md` lists Wikimedia Commons photos (login and home page). CC BY-SA ones need a visible credit, and the FAM trip photos' source isn't recorded. Replace them with TravelXM's own photos, or confirm the rights.
- **Google key.** In Google Cloud, restrict the Drive key to the Drive API.
- **Client photos.** Every agent can see `999_Clients pictures & videos` in Marketing Assets, and those Drive files are public to anyone with the link.
- **Zoho form banner.** At phone width the form's own banner breaks "Upcoming FAM Trips" into pieces. Fix it in Zoho Forms (theme, header text size).
