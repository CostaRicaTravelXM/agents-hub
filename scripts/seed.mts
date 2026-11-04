/**
 * Demo seed for TravelXM Academy.
 *
 *   npx supabase db reset && npm run seed
 *
 * Creates staff and agent accounts, the course catalog from seed-content.mts,
 * generated lesson videos (ffmpeg, Ken Burns over the destination photos) and
 * branded PDFs, a partner group, and ten weeks of synthetic learner activity so
 * the analytics dashboard has something to show.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import React from "react";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { categories, courses, photoForVideo, type SeedCourse } from "./seed-content.mts";

const root = process.cwd();
const cache = path.join(root, ".seed-cache");
const VIDEO_SECONDS = 40;
const PASSWORD = "Academy2026!";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const s3 = new S3Client({
  region: process.env.R2_REGION ?? "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  forcePathStyle: process.env.R2_FORCE_PATH_STYLE === "true",
});
const privateBucket = process.env.R2_PRIVATE_BUCKET ?? "academy-private";

function must<T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as NonNullable<T>;
}

async function upload(key: string, body: Buffer, contentType: string) {
  await s3.send(new PutObjectCommand({ Bucket: privateBucket, Key: key, Body: body, ContentType: contentType }));
}

// ---------------------------------------------------------------- media
function makeVideo(photo: string, out: string) {
  if (existsSync(out)) return;
  const vf =
    "scale=2560:-2,zoompan=z='min(1+0.00035*on,1.35)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=25,format=yuv420p";
  const r = spawnSync(
    "ffmpeg",
    [
      "-y", "-loglevel", "error",
      "-loop", "1", "-framerate", "25", "-i", photo,
      "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-t", String(VIDEO_SECONDS), "-vf", vf,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "30",
      "-c:a", "aac", "-b:a", "64k", "-shortest", "-movflags", "+faststart", out,
    ],
    { stdio: "inherit" },
  );
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${photo}. Is ffmpeg installed and on PATH?`);
}

Font.register({ family: "Anton", src: path.join(root, "assets/fonts/Anton-Regular.ttf") });
Font.register({
  family: "Arimo",
  fonts: [
    { src: path.join(root, "assets/fonts/Arimo-Regular.ttf") },
    { src: path.join(root, "assets/fonts/Arimo-Bold.ttf"), fontWeight: 700 },
  ],
});
Font.register({ family: "Montserrat", src: path.join(root, "assets/fonts/Montserrat-SemiBold.ttf"), fontWeight: 600 });

const pdfStyles = StyleSheet.create({
  page: { backgroundColor: "#FDF6E3", padding: 48, fontFamily: "Arimo", fontSize: 11, color: "#3D3733", lineHeight: 1.55 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  logo: { width: 64, height: 64 },
  eyebrow: { fontFamily: "Montserrat", fontWeight: 600, fontSize: 9, letterSpacing: 1.4, color: "#70A91B", textTransform: "uppercase" },
  title: { fontFamily: "Anton", fontSize: 30, color: "#000000", textTransform: "uppercase", marginTop: 6, lineHeight: 1 },
  rule: { height: 4, backgroundColor: "#70A91B", width: 48, marginVertical: 18 },
  h2: { fontFamily: "Montserrat", fontWeight: 600, fontSize: 13, color: "#000000", marginTop: 16, marginBottom: 6 },
  p: { marginBottom: 6 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E3DCCB", paddingVertical: 6 },
  cellL: { width: "40%", fontWeight: 700, color: "#000000" },
  cellR: { width: "60%" },
  foot: { position: "absolute", bottom: 32, left: 48, right: 48, fontSize: 8, color: "#6B625C", flexDirection: "row", justifyContent: "space-between" },
});

const h = React.createElement;
type Section = { heading: string; paragraphs?: string[]; rows?: [string, string][] };

async function makePdf(eyebrow: string, title: string, sections: Section[]) {
  const logo = { data: readFileSync(path.join(root, "public/brand/travelxm-logo.png")), format: "png" as const };
  const tree = h(
    Document,
    { title, author: "TravelXM" },
    h(
      Page,
      { size: "LETTER", style: pdfStyles.page },
      h(
        View,
        { style: pdfStyles.head },
        h(View, null, h(Text, { style: pdfStyles.eyebrow }, eyebrow), h(Text, { style: pdfStyles.title }, title)),
        h(Image, { src: logo, style: pdfStyles.logo }),
      ),
      h(View, { style: pdfStyles.rule }),
      ...sections.map((s, idx) =>
        h(
          View,
          { key: idx, wrap: false },
          h(Text, { style: pdfStyles.h2 }, s.heading),
          ...(s.paragraphs ?? []).map((t, j) => h(Text, { key: j, style: pdfStyles.p }, t)),
          ...(s.rows ?? []).map(([l, r], j) =>
            h(View, { key: `r${j}`, style: pdfStyles.row }, h(Text, { style: pdfStyles.cellL }, l), h(Text, { style: pdfStyles.cellR }, r)),
          ),
        ),
      ),
      h(View, { style: pdfStyles.foot, fixed: true }, h(Text, null, "TravelXM · Pura Vida"), h(Text, null, "TravelXM Academy · for travel advisors")),
    ),
  );
  return Buffer.from(await renderToBuffer(tree as never));
}

const pdfs: Record<string, () => Promise<Buffer>> = {
  "documents/demo/advisor-handbook.pdf": () =>
    makePdf("Advisor handbook", "Working with TravelXM", [
      { heading: "Who to call", rows: [["Sales and quotes", "sales@travelxm.com · reply within one business day"], ["Operations, 24/7", "WhatsApp line in the final documents"], ["Accounts", "Commission statements and invoices"]] },
      { heading: "Booking terms", rows: [["Deposit", "30% confirms the booking, rooms held 72 h"], ["Balance", "45 days before arrival"], ["Final documents", "Within 48 h of the balance"], ["Commission", "Paid within 15 days of the clients' return"]] },
      { heading: "Cancellations", paragraphs: ["More than 60 days before arrival: deposit refunded less hotel penalties.", "Between 60 and 30 days: 50% of the package.", "Fewer than 30 days: non-refundable. Recommend travel insurance at booking."] },
      { heading: "Emergencies", paragraphs: ["If a client is delayed, injured or loses documents, contact operations first. We coordinate transfers, hotels and, if needed, the embassy."] },
    ]),
  "documents/demo/destination-fact-sheets.pdf": () =>
    makePdf("Fact sheets", "Signature destinations", [
      { heading: "Arenal & La Fortuna", rows: [["From San José", "3 h by road"], ["Altitude", "About 500 m"], ["Nights", "3 recommended"], ["Signature", "Hot springs, hanging bridges, La Fortuna waterfall"]] },
      { heading: "Monteverde", rows: [["From Arenal", "3–3.5 h (jeep-boat-jeep or road)"], ["Altitude", "About 1,400 m, bring a jacket"], ["Nights", "2 minimum"], ["Signature", "Reserve walk at 7:00, night walk, canopy bridges"]] },
      { heading: "Manuel Antonio", rows: [["From Monteverde", "4 h by road"], ["Park", "Closed on Tuesdays, timed tickets"], ["Nights", "3 recommended"], ["Signature", "Guided park walk, catamaran, ridge-top sunsets"]] },
    ]),
  "documents/demo/arenal-fact-sheet.pdf": () =>
    makePdf("Fact sheet", "Arenal & La Fortuna", [
      { heading: "Getting there", rows: [["San José airport", "3 h"], ["Liberia airport", "2.5 h"], ["Monteverde", "3–3.5 h"]] },
      { heading: "What we book", paragraphs: ["Hanging bridges with a naturalist guide, 2.5 h, best at 7:30.", "La Fortuna waterfall, 500 steps each way, swim at the base.", "Hot springs day pass or a resort with springs on site.", "Lake Arenal kayak or a sunset boat."] },
    ]),
  "documents/demo/partner-rate-sheet.pdf": () =>
    makePdf("Partners only · 2027", "Group rate sheet", [
      { heading: "Room blocks", rows: [["20–59 guests", "Up to 2 hotels, release 60 days"], ["60–200 guests", "1 hotel, release 90 days"], ["Attrition", "Up to 10% without penalty"]] },
      { heading: "Blackout dates", paragraphs: ["20 December to 5 January, and Easter week. Group rates do not apply on these dates."] },
      { heading: "Included", paragraphs: ["Airport meet and greet, private coaches with bilingual guides, one welcome and one farewell event, and a TravelXM host on site for groups over 40."] },
    ]),
};

// ---------------------------------------------------------------- people
const staff = [
  { email: "admin@travelxm.test", full_name: "Andrea Solís", role: "admin", company: "TravelXM", country: "Costa Rica" },
  { email: "content@travelxm.test", full_name: "Diego Mora", role: "content_manager", company: "TravelXM", country: "Costa Rica" },
];
const agents = [
  { email: "agent@travelxm.test", full_name: "Sarah Mitchell", company: "Blue Horizon Travel", country: "United States" },
  { email: "james.carter@example.com", full_name: "James Carter", company: "Carter & Co. Journeys", country: "Canada" },
  { email: "emily.nguyen@example.com", full_name: "Emily Nguyen", company: "Wanderwise Travel", country: "United States" },
  { email: "laura.bennett@example.com", full_name: "Laura Bennett", company: "Bennett Luxury Escapes", country: "United Kingdom" },
  { email: "michael.ross@example.com", full_name: "Michael Ross", company: "Summit Travel Group", country: "United States" },
  { email: "olivia.park@example.com", full_name: "Olivia Park", company: "Pacific Trails", country: "Canada" },
  { email: "daniel.hughes@example.com", full_name: "Daniel Hughes", company: "Hughes Travel Studio", country: "United States" },
  { email: "sofia.ramirez@example.com", full_name: "Sofía Ramírez", company: "Viajes del Sol", country: "Mexico" },
  { email: "noah.williams@example.com", full_name: "Noah Williams", company: "Northbound Travel", country: "United States" },
  { email: "chloe.martin@example.com", full_name: "Chloé Martin", company: "Évasion Voyages", country: "Canada" },
  { email: "ryan.kim@example.com", full_name: "Ryan Kim", company: "Harbor & Pine Travel", country: "United States" },
  { email: "grace.taylor@example.com", full_name: "Grace Taylor", company: "Taylor Made Trips", country: "Australia" },
];

// Deterministic pseudo-random so every seed gives the same dashboard.
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const daysAgo = (d: number, hour = 10) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(hour, Math.floor(rand() * 60), 0, 0);
  return t.toISOString();
};

async function createUser(u: { email: string; full_name: string; company: string; country: string }, createdDaysAgo: number) {
  const res = await supabase.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: u.full_name, company: u.company, country: u.country },
  });
  if (res.error) throw new Error(`createUser ${u.email}: ${res.error.message}`);
  const id = res.data.user.id;
  must(
    await supabase
      .from("profiles")
      .update({ onboarded_at: daysAgo(createdDaysAgo), created_at: daysAgo(createdDaysAgo), last_seen_at: daysAgo(Math.max(0, createdDaysAgo - 3)) })
      .eq("id", id),
    "profile",
  );
  return id;
}

// ---------------------------------------------------------------- main
async function main() {
  const { count } = await supabase.from("courses").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    console.log("Courses already exist. Run `npx supabase db reset` first for a clean seed.");
    return;
  }

  mkdirSync(cache, { recursive: true });
  console.log("· generating and uploading videos");
  for (const [key, photo] of Object.entries(photoForVideo)) {
    const out = path.join(cache, path.basename(key));
    makeVideo(path.join(root, photo), out);
    await upload(key, readFileSync(out), "video/mp4");
  }
  console.log("· generating and uploading PDFs");
  for (const [key, make] of Object.entries(pdfs)) {
    await upload(key, await make(), "application/pdf");
  }

  console.log("· creating accounts");
  const staffIds: Record<string, string> = {};
  for (const s of staff) {
    const id = await createUser(s, 90);
    must(await supabase.from("profiles").update({ role: s.role as "admin" | "content_manager" }).eq("id", id), "role");
    staffIds[s.role] = id;
  }
  const agentIds: string[] = [];
  for (const [idx, a] of agents.entries()) {
    agentIds.push(await createUser(a, 70 - idx * 5));
  }

  console.log("· creating catalog");
  const cats = must(await supabase.from("categories").insert(categories.map((c, idx) => ({ ...c, sort_order: idx }))).select(), "categories");
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

  type LessonRow = { id: string; type: string; module: number; required: boolean; quizId?: string; questions?: { id: string; correct: string[] }[] };
  const courseMap: Record<string, { id: string; lessons: LessonRow[]; def: SeedCourse }> = {};

  for (const [ci, c] of courses.entries()) {
    const course = must(
      await supabase
        .from("courses")
        .insert({
          slug: c.slug,
          title: c.title,
          subtitle: c.subtitle,
          description: c.description,
          cover_key: c.cover,
          category_id: catId[c.category],
          level: c.level,
          status: c.status ?? "published",
          visibility: c.visibility ?? "public",
          featured: c.featured ?? false,
          estimated_minutes: c.minutes,
          sort_order: ci,
          created_by: staffIds.content_manager,
          published_at: c.status === "draft" ? null : daysAgo(80),
        })
        .select()
        .single(),
      `course ${c.slug}`,
    );
    const lessons: LessonRow[] = [];
    const moduleIds: string[] = [];
    for (const [mi, m] of c.modules.entries()) {
      const mod = must(
        await supabase.from("modules").insert({ course_id: course.id, title: m.title, description: m.description, sort_order: mi }).select().single(),
        "module",
      );
      moduleIds.push(mod.id);
      for (const req of m.requires ?? []) {
        must(await supabase.from("module_requirements").insert({ module_id: mod.id, required_module_id: moduleIds[req] }), "requirement");
      }
      for (const [li, l] of m.lessons.entries()) {
        const row = must(
          await supabase
            .from("lessons")
            .insert({
              module_id: mod.id,
              course_id: course.id,
              title: l.title,
              summary: l.summary,
              type: l.type,
              sort_order: li,
              duration_seconds: l.type === "video" ? VIDEO_SECONDS : l.minutes ? l.minutes * 60 : null,
              video_key: l.video ?? null,
              poster_key: l.poster ?? null,
              file_key: l.pdf ?? null,
              file_name: l.pdf ? `${l.title}.pdf` : null,
              file_mime: l.pdf ? "application/pdf" : null,
              file_size: l.pdf ? 60_000 : null,
              external_url: l.url ?? null,
              body: l.body ?? null,
              required_completion_pct: l.requiredPct ?? 90,
              is_required: l.required ?? true,
            })
            .select()
            .single(),
          "lesson",
        );
        const lr: LessonRow = { id: row.id, type: l.type, module: mi, required: l.required ?? true };
        if (l.quiz) {
          const quiz = must(
            await supabase.from("quizzes").insert({ lesson_id: row.id, passing_score: l.quiz.passing, max_attempts: l.quiz.attempts }).select().single(),
            "quiz",
          );
          const letters = "abcdefgh";
          const qs = must(
            await supabase
              .from("quiz_questions")
              .insert(
                l.quiz.questions.map((qq, qi) => ({
                  quiz_id: quiz.id,
                  prompt: qq.prompt,
                  type: qq.type,
                  options: qq.options.map((t, oi) => ({ id: letters[oi], text: t })),
                  correct: qq.correct.map((oi) => letters[oi]),
                  explanation: qq.explanation,
                  sort_order: qi,
                })),
              )
              .select(),
            "questions",
          );
          lr.quizId = quiz.id;
          lr.questions = qs.map((x) => ({ id: x.id, correct: x.correct as string[] }));
        }
        lessons.push(lr);
      }
    }
    for (const [ri, r] of (c.resources ?? []).entries()) {
      must(
        await supabase.from("resources").insert({
          course_id: course.id,
          title: r.title,
          description: r.description,
          file_key: r.pdf ?? null,
          file_name: r.pdf ? `${r.title}.pdf` : null,
          file_mime: r.pdf ? "application/pdf" : null,
          file_size: r.pdf ? 60_000 : null,
          external_url: r.url ?? null,
          sort_order: ri,
        }),
        "resource",
      );
    }
    courseMap[c.slug] = { id: course.id, lessons, def: c };
  }

  console.log("· creating partner group");
  const group = must(
    await supabase
      .from("groups")
      .insert({ name: "Partner Agencies 2027", description: "Agencies in the 2027 groups and incentives partner program.", join_code: "PARTNER27", created_by: staffIds.admin })
      .select()
      .single(),
    "group",
  );
  must(await supabase.from("course_groups").insert({ course_id: courseMap["groups-incentives-2027"].id, group_id: group.id }), "course_groups");
  const partnerAgents = [1, 3, 4, 7];
  must(
    await supabase.from("group_members").insert(
      partnerAgents.map((i) => ({ group_id: group.id, user_id: agentIds[i], added_by: staffIds.admin, joined_via: "admin" })),
    ),
    "members",
  );

  console.log("· simulating ten weeks of learning activity");
  // [agent index, course slug, share of required lessons completed]
  const plan: [number, string, number][] = [
    [0, "costa-rica-specialist", 0.4],
    [0, "arenal-la-fortuna", 1],
    [1, "costa-rica-specialist", 1],
    [1, "groups-incentives-2027", 1],
    [1, "manuel-antonio", 0.5],
    [2, "costa-rica-specialist", 1],
    [2, "monteverde-cloud-forest", 1],
    [3, "costa-rica-specialist", 0.75],
    [3, "groups-incentives-2027", 0.5],
    [4, "costa-rica-specialist", 1],
    [4, "arenal-la-fortuna", 0.6],
    [4, "groups-incentives-2027", 0.25],
    [5, "costa-rica-specialist", 0.2],
    [5, "tortuguero-canals", 1],
    [6, "arenal-la-fortuna", 1],
    [6, "costa-rica-specialist", 0.55],
    [7, "costa-rica-specialist", 1],
    [7, "costa-ballena-whales", 0.5],
    [8, "monteverde-cloud-forest", 0.5],
    [8, "costa-rica-specialist", 0.1],
    [9, "manuel-antonio", 1],
    [9, "arenal-la-fortuna", 0.3],
    [10, "costa-rica-specialist", 0.3],
    [11, "costa-ballena-whales", 1],
  ];

  for (const [ai, slug, share] of plan) {
    const userId = agentIds[ai];
    const course = courseMap[slug];
    const startDay = 60 - ai * 4 - Math.floor(rand() * 6);
    must(
      await supabase.from("enrollments").insert({ user_id: userId, course_id: course.id, enrolled_at: daysAgo(startDay), started_at: daysAgo(startDay) }),
      "enrollment",
    );
    const events: { user_id: string; course_id: string; lesson_id?: string; event: string; payload?: object; created_at: string }[] = [
      { user_id: userId, course_id: course.id, event: "course_view", created_at: daysAgo(startDay + 1) },
      { user_id: userId, course_id: course.id, event: "enroll", created_at: daysAgo(startDay) },
    ];
    const required = course.lessons.filter((l) => l.required);
    const doneCount = Math.round(required.length * share);
    const timeRows: Record<string, number> = {};
    let day = startDay;
    for (const [li, l] of required.entries()) {
      if (li > doneCount) break;
      const completed = li < doneCount;
      day = Math.max(0, day - Math.floor(rand() * 3));
      const at = daysAgo(day, 9 + Math.floor(rand() * 9));
      const seconds = l.type === "video" ? VIDEO_SECONDS + Math.floor(rand() * 20) : 120 + Math.floor(rand() * 360);
      if (l.quizId && completed) {
        const answers = Object.fromEntries((l.questions ?? []).map((qq) => [qq.id, qq.correct]));
        must(await supabase.from("quiz_attempts").insert({ user_id: userId, quiz_id: l.quizId, answers, score: 100, passed: true, created_at: at }), "attempt");
        events.push({ user_id: userId, course_id: course.id, lesson_id: l.id, event: "quiz_submit", payload: { score: 100, passed: true }, created_at: at });
      }
      must(
        await supabase.from("lesson_progress").insert({
          user_id: userId,
          lesson_id: l.id,
          course_id: course.id,
          status: completed ? "completed" : "in_progress",
          watch_pct: l.type === "video" ? (completed ? 100 : 45) : completed ? 100 : 0,
          seconds_spent: completed ? seconds : Math.floor(seconds / 2),
          last_position_seconds: completed ? 0 : 18,
          started_at: at,
          completed_at: completed ? at : null,
          updated_at: at,
        }),
        "progress",
      );
      events.push({ user_id: userId, course_id: course.id, lesson_id: l.id, event: "lesson_start", created_at: at });
      if (completed) events.push({ user_id: userId, course_id: course.id, lesson_id: l.id, event: "lesson_complete", created_at: at });
      const d = at.slice(0, 10);
      timeRows[d] = (timeRows[d] ?? 0) + (completed ? seconds : Math.floor(seconds / 2));
    }
    const lastLesson = required[Math.min(doneCount, required.length - 1)];
    must(
      await supabase.from("enrollments").update({ last_lesson_id: lastLesson?.id, last_activity_at: daysAgo(day) }).eq("user_id", userId).eq("course_id", course.id),
      "enrollment activity",
    );
    if (doneCount >= required.length) {
      must(await supabase.from("enrollments").update({ completed_at: daysAgo(day, 18) }).eq("user_id", userId).eq("course_id", course.id), "completion date");
      must(await supabase.from("certificates").update({ issued_at: daysAgo(day, 18) }).eq("user_id", userId).eq("course_id", course.id), "certificate date");
      events.push({ user_id: userId, course_id: course.id, event: "course_complete", created_at: daysAgo(day, 18) });
      events.push({ user_id: userId, course_id: course.id, event: "certificate_issued", created_at: daysAgo(day, 18) });
    }
    must(
      await supabase.from("learning_time_daily").insert(Object.entries(timeRows).map(([d, s]) => ({ user_id: userId, course_id: course.id, day: d, seconds: s }))),
      "time",
    );
    must(
      await supabase.from("learning_events").insert(events.map((e) => ({ lesson_id: null, payload: {}, ...e }))),
      "events",
    );
  }

  // Extra browsing so "most viewed destinations" has a shape.
  const browse: { user_id: string; course_id: string; event: string; created_at: string }[] = [];
  const weights: Record<string, number> = {
    "arenal-la-fortuna": 26, "manuel-antonio": 18, "monteverde-cloud-forest": 15, "costa-ballena-whales": 11, "tortuguero-canals": 7, "costa-rica-specialist": 30,
  };
  for (const [slug, n] of Object.entries(weights)) {
    for (let k = 0; k < n; k++) {
      browse.push({ user_id: agentIds[Math.floor(rand() * agentIds.length)], course_id: courseMap[slug].id, event: "course_view", created_at: daysAgo(Math.floor(rand() * 28)) });
    }
  }
  must(await supabase.from("learning_events").insert(browse.map((e) => ({ lesson_id: null, payload: {}, ...e }))), "browse events");

  // Agent Portal (agents.travelxm.com) shares these accounts: give the demo
  // agent a book of clients and bookings there. The package catalogue comes
  // from supabase/seeds/portal.sql.
  console.log("· loading Agent Portal demo data");
  must(await supabase.rpc("portal_seed_demo", { p_agent: agentIds[0] }), "portal demo data");
  // The portal is gated on an approved verification; the demo agent starts approved.
  must(
    await supabase.from("agent_verifications").upsert({ user_id: agentIds[0], status: "approved", reviewed_at: new Date().toISOString() }),
    "demo agent verification",
  );

  console.log("\nSeed complete.\n");
  console.log(`  Admin            admin@travelxm.test / ${PASSWORD}`);
  console.log(`  Content manager  content@travelxm.test / ${PASSWORD}`);
  console.log(`  Agent            agent@travelxm.test / ${PASSWORD}  (also signs in to the Agent Portal)`);
  console.log(`  Partner invite   /join/PARTNER27\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
