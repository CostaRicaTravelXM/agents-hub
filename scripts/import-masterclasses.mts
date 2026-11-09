/**
 * Puts the Greenroom master classes into the Hub: one course per episode, with the
 * video, a quiz written from the transcript, and a certificate.
 *
 * Two steps, because storage and the database go live at different times:
 *
 *   1. upload: videos to the private bucket, posters to the public one.
 *      Keys come from each file's contents, so a re-run skips what is already there
 *      and a re-encoded file gets a new key (posters are cached for a year).
 *      Writes scripts/masterclasses-media.json, which step 2 reads.
 *
 *        node --env-file=.env.local scripts/import-masterclasses.mts upload --media <dir>
 *
 *      <dir> holds one folder per episode (GR01, GR02 …) with web.mp4 and poster.jpg.
 *
 *   2. apply: creates or updates the courses from scripts/masterclasses.mts and the media file.
 *      Existing courses are updated in place, so agents keep their progress and certificates.
 *
 *        node --env-file=.env.local scripts/import-masterclasses.mts apply [--publish]
 *
 * Anything not on this machine (Cloudflare R2, the production database) only changes with --yes.
 * Without it the script prints what it would do.
 */
import { createHash } from "node:crypto";
import { existsSync, openSync, readFileSync, readSync, closeSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types.ts";
import { CATEGORY, masterclasses, type Masterclass } from "./masterclasses.mts";
import { nonLocalTargets } from "./local-only.mts";

const MANIFEST = path.join(import.meta.dirname, "masterclasses-media.json");
const PUBLIC_CACHE_CONTROL = "public, max-age=31536000, immutable";
const PART_SIZE = 64 * 1024 ** 2;
const PART_CONCURRENCY = 4;

type Media = { video_key: string; poster_key: string; duration_seconds: number; video_bytes: number };
type Manifest = Record<string, Media>;

const args = process.argv.slice(2);
const command = args[0];
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

function need(names: string[]) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`Not set: ${missing.join(", ")}. Pass the right file with node --env-file=…`);
    process.exit(1);
  }
}

/** Remote targets change only with --yes. Returns true when this run may write. */
function mayWrite(targets: Record<string, string | undefined>) {
  const remote = nonLocalTargets(targets);
  console.log(`Target: ${Object.entries(targets).map(([k, v]) => `${k}=${v}`).join("  ")}`);
  if (!remote.length || flag("yes")) return true;
  console.log(`\n${remote.join(", ")} ${remote.length === 1 ? "is" : "are"} not on this machine. Showing the plan only; add --yes to write.\n`);
  return false;
}

const readManifest = (): Manifest => (existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {});

// ---------------------------------------------------------------- upload
function s3() {
  return new S3Client({
    region: process.env.R2_REGION ?? "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
    forcePathStyle: process.env.R2_FORCE_PATH_STYLE === "true",
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

/** First 8 hex characters of the file's SHA-256, read in chunks so a 1 GB video never sits in memory. */
function shortHash(file: string) {
  const hash = createHash("sha256");
  const fd = openSync(file, "r");
  const buf = Buffer.alloc(8 * 1024 ** 2);
  try {
    let n: number;
    while ((n = readSync(fd, buf, 0, buf.length, null)) > 0) hash.update(buf.subarray(0, n));
  } finally {
    closeSync(fd);
  }
  return hash.digest("hex").slice(0, 8);
}

async function storedSize(client: S3Client, bucket: string, key: string) {
  try {
    return (await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))).ContentLength ?? null;
  } catch {
    return null;
  }
}

async function putLarge(client: S3Client, bucket: string, key: string, file: string, contentType: string) {
  const size = statSync(file).size;
  const parts = Math.ceil(size / PART_SIZE);
  const { UploadId } = await client.send(new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType: contentType }));
  if (!UploadId) throw new Error("Storage did not start the upload");
  const etags: { PartNumber: number; ETag: string }[] = [];
  const fd = openSync(file, "r");
  try {
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (next < parts) {
        const i = next++;
        const length = Math.min(PART_SIZE, size - i * PART_SIZE);
        const body = Buffer.alloc(length);
        readSync(fd, body, 0, length, i * PART_SIZE);
        for (let attempt = 1; ; attempt++) {
          try {
            const res = await client.send(new UploadPartCommand({ Bucket: bucket, Key: key, UploadId, PartNumber: i + 1, Body: body }));
            etags.push({ PartNumber: i + 1, ETag: res.ETag! });
            break;
          } catch (e) {
            if (attempt >= 4) throw e;
            await new Promise((r) => setTimeout(r, 2000 * attempt));
          }
        }
        done++;
        process.stdout.write(`\r    ${done}/${parts} parts`);
      }
    };
    await Promise.all(Array.from({ length: Math.min(PART_CONCURRENCY, parts) }, worker));
    process.stdout.write("\n");
    etags.sort((a, b) => a.PartNumber - b.PartNumber);
    await client.send(new CompleteMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId, MultipartUpload: { Parts: etags } }));
  } catch (e) {
    await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId })).catch(() => {});
    throw e;
  } finally {
    closeSync(fd);
  }
}

async function upload() {
  need(["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]);
  const dir = option("media");
  if (!dir || !existsSync(dir)) {
    console.error("Pass --media <dir>, the folder with GR01, GR02 … inside.");
    process.exit(1);
  }
  const privateBucket = process.env.R2_PRIVATE_BUCKET ?? "academy-private";
  const publicBucket = process.env.R2_PUBLIC_BUCKET ?? "academy-public";
  const write = mayWrite({ R2_ENDPOINT: process.env.R2_ENDPOINT });
  const client = s3();
  const manifest = readManifest();

  for (const m of masterclasses) {
    const video = path.join(dir, m.code, "web.mp4");
    const poster = path.join(dir, m.code, "poster.jpg");
    const durationFile = path.join(dir, m.code, "duration.txt");
    if (!existsSync(video) || !existsSync(poster) || !existsSync(durationFile)) {
      console.log(`${m.code}: not ready in ${dir}, skipped`);
      continue;
    }
    const media: Media = {
      video_key: `videos/masterclasses/${shortHash(video)}-${m.slug}.mp4`,
      poster_key: `images/masterclasses/${shortHash(poster)}-${m.slug}.jpg`,
      duration_seconds: Math.round(Number(readFileSync(durationFile, "utf8").trim())),
      video_bytes: statSync(video).size,
    };
    const haveVideo = (await storedSize(client, privateBucket, media.video_key)) === media.video_bytes;
    const havePoster = (await storedSize(client, publicBucket, media.poster_key)) === statSync(poster).size;
    console.log(`${m.code} ${m.slug}: video ${haveVideo ? "already there" : "to upload"}, poster ${havePoster ? "already there" : "to upload"}`);
    if (!write) continue;
    if (!haveVideo) {
      console.log(`  ${privateBucket}/${media.video_key} (${(media.video_bytes / 1024 ** 2).toFixed(0)} MB)`);
      await putLarge(client, privateBucket, media.video_key, video, "video/mp4");
    }
    if (!havePoster) {
      await client.send(
        new PutObjectCommand({
          Bucket: publicBucket,
          Key: media.poster_key,
          Body: readFileSync(poster),
          ContentType: "image/jpeg",
          CacheControl: PUBLIC_CACHE_CONTROL,
        }),
      );
    }
    manifest[m.code] = media;
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  }
  if (write) console.log(`\nWrote ${path.relative(process.cwd(), MANIFEST)}`);
}

// ---------------------------------------------------------------- apply
type Db = SupabaseClient<Database>;

function must<T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as NonNullable<T>;
}

const LETTERS = "abcdefgh";
function questionRows(quizId: string, m: Masterclass) {
  return m.quiz.questions.map((q, i) => ({
    quiz_id: quizId,
    prompt: q.prompt,
    type: q.type,
    options: q.options.map((text, oi) => ({ id: LETTERS[oi], text })),
    correct: q.correct.map((oi) => LETTERS[oi]),
    explanation: q.explanation,
    sort_order: i,
  }));
}

type LessonRow = Database["public"]["Tables"]["lessons"]["Insert"];
async function upsertLesson(db: Db, existing: { id: string } | undefined, row: LessonRow) {
  if (existing) {
    must(await db.from("lessons").update(row).eq("id", existing.id), "lesson update");
    return existing.id;
  }
  return must(await db.from("lessons").insert(row).select("id").single(), "lesson insert").id as string;
}

async function applyOne(db: Db, m: Masterclass, media: Media, categoryId: string, sortOrder: number, publish: boolean) {
  const videoMinutes = Math.ceil(media.duration_seconds / 60);
  const courseRow = {
    slug: m.slug,
    title: m.title,
    subtitle: m.subtitle,
    description: m.description,
    cover_key: media.poster_key,
    category_id: categoryId,
    level: "foundation" as const,
    visibility: "public" as const,
    // The video plus a few minutes for the quiz.
    estimated_minutes: videoMinutes + 5,
    certificate_enabled: true,
    sort_order: sortOrder,
  };

  const found = must(await db.from("courses").select("id, status").eq("slug", m.slug).maybeSingle(), "course lookup") as {
    id: string;
    status: string;
  } | null;
  let courseId: string;
  if (found) {
    courseId = found.id;
    must(await db.from("courses").update({ ...courseRow, ...(publish ? { status: "published" } : {}) }).eq("id", courseId), "course update");
  } else {
    courseId = must(
      await db
        .from("courses")
        .insert({ ...courseRow, status: publish ? "published" : "draft" })
        .select("id")
        .single(),
      "course insert",
    ).id as string;
  }

  const modules = must(await db.from("modules").select("id").eq("course_id", courseId).order("sort_order"), "modules") as { id: string }[];
  const moduleId =
    modules[0]?.id ??
    (must(await db.from("modules").insert({ course_id: courseId, title: "Master class", sort_order: 0 }).select("id").single(), "module")
      .id as string);
  must(await db.from("modules").update({ title: "Master class", description: null }).eq("id", moduleId), "module update");

  const lessons = must(await db.from("lessons").select("id, type").eq("course_id", courseId).order("sort_order"), "lessons") as {
    id: string;
    type: string;
  }[];
  const videoLesson = lessons.find((l) => l.type === "video");
  const quizLesson = lessons.find((l) => l.type === "quiz");

  await upsertLesson(db, videoLesson, {
    module_id: moduleId,
    course_id: courseId,
    title: m.title,
    summary: m.lessonSummary,
    type: "video",
    sort_order: 0,
    duration_seconds: media.duration_seconds,
    video_key: media.video_key,
    poster_key: media.poster_key,
    external_url: null,
    required_completion_pct: 90,
    is_required: true,
  });
  const quizLessonId = await upsertLesson(db, quizLesson, {
    module_id: moduleId,
    course_id: courseId,
    title: "Quiz",
    summary: `${m.quiz.questions.length} questions. Score ${m.quiz.passing}% or more to get your certificate.`,
    type: "quiz",
    sort_order: 1,
    duration_seconds: null,
    required_completion_pct: 100,
    is_required: true,
  });

  // Lessons from an earlier version of this course (a Drive embed, extra readings) would block completion.
  const stale = lessons.filter((l) => l.id !== videoLesson?.id && l.id !== quizLesson?.id).map((l) => l.id);
  if (stale.length) must(await db.from("lessons").delete().in("id", stale), "stale lessons");

  const quiz = must(await db.from("quizzes").select("id").eq("lesson_id", quizLessonId).maybeSingle(), "quiz lookup") as { id: string } | null;
  const quizId =
    quiz?.id ??
    (must(await db.from("quizzes").insert({ lesson_id: quizLessonId, passing_score: m.quiz.passing, max_attempts: null }).select("id").single(), "quiz")
      .id as string);
  must(await db.from("quizzes").update({ passing_score: m.quiz.passing, shuffle_questions: true }).eq("id", quizId), "quiz update");

  // Replace the questions only when they changed, so a re-run does not churn ids.
  const want = questionRows(quizId, m);
  const have = must(
    await db.from("quiz_questions").select("prompt, type, options, correct, explanation, sort_order").eq("quiz_id", quizId).order("sort_order"),
    "questions",
  );
  const comparable = (rows: object[]) => JSON.stringify(rows.map((r) => ({ ...r, quiz_id: undefined })));
  const same = comparable(have) === comparable(want);
  if (!same) {
    must(await db.from("quiz_questions").delete().eq("quiz_id", quizId), "questions delete");
    must(await db.from("quiz_questions").insert(want), "questions insert");
  }
  return { courseId, created: !found, questionsChanged: !same };
}

async function apply() {
  need(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  const manifest = readManifest();
  const publish = flag("publish");
  const write = mayWrite({ NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL });

  const ready = masterclasses.filter((m) => manifest[m.code]);
  for (const m of masterclasses) {
    console.log(`${m.code} ${m.slug}: ${manifest[m.code] ? `${m.quiz.questions.length} questions, ${Math.round(manifest[m.code].duration_seconds / 60)} min` : "no media yet, skipped"}`);
  }
  if (!write || !ready.length) return;

  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const category = must(
    await db.from("categories").upsert({ ...CATEGORY, is_destination: false }, { onConflict: "slug" }).select("id").single(),
    "category",
  );
  for (const m of ready) {
    const r = await applyOne(db, m, manifest[m.code], category.id as string, masterclasses.indexOf(m), publish);
    console.log(`  ${m.slug}: ${r.created ? "created" : "updated"}${r.questionsChanged ? ", questions written" : ""}`);
  }
  console.log(publish ? "\nPublished." : "\nSaved as drafts (new courses). Add --publish to make them visible to agents.");
}

if (command === "upload") await upload();
else if (command === "apply") await apply();
else {
  console.error("Usage: import-masterclasses.mts upload --media <dir> | apply [--publish]   (add --yes for remote targets)");
  process.exit(1);
}
