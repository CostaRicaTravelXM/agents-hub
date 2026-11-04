/**
 * Creates the two media buckets, makes the public one readable, and applies
 * CORS so the admin can upload straight from the browser with presigned PUTs.
 *
 *   npm run storage:setup
 *
 * Works against local RustFS and against Cloudflare R2 (on R2, create the
 * buckets and enable public access for the public bucket in the dashboard;
 * this script then only applies CORS and skips what R2 does not support).
 */
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const endpoint = process.env.R2_ENDPOINT!;
const s3 = new S3Client({
  region: process.env.R2_REGION ?? "auto",
  endpoint,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  forcePathStyle: process.env.R2_FORCE_PATH_STYLE === "true",
});

const privateBucket = process.env.R2_PRIVATE_BUCKET ?? "academy-private";
const publicBucket = process.env.R2_PUBLIC_BUCKET ?? "academy-public";
const origins = (process.env.STORAGE_CORS_ORIGINS ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function ensureBucket(name: string) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: name }));
    console.log(`bucket ${name}: exists`);
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: name }));
    console.log(`bucket ${name}: created`);
  }
}

async function main() {
  await ensureBucket(privateBucket);
  await ensureBucket(publicBucket);

  const cors = {
    CORSRules: [
      {
        AllowedOrigins: origins,
        AllowedMethods: ["GET", "PUT", "HEAD"],
        AllowedHeaders: ["*"],
        ExposeHeaders: ["ETag", "Content-Length", "Content-Range", "Accept-Ranges"],
        MaxAgeSeconds: 3600,
      },
    ],
  };
  for (const b of [privateBucket, publicBucket]) {
    try {
      await s3.send(new PutBucketCorsCommand({ Bucket: b, CORSConfiguration: cors }));
      console.log(`bucket ${b}: CORS set for ${origins.join(", ")}`);
    } catch (e) {
      console.warn(`bucket ${b}: could not set CORS (${(e as Error).message})`);
    }
  }

  if (!endpoint.includes("r2.cloudflarestorage.com")) {
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: ["*"] },
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${publicBucket}/*`],
        },
      ],
    };
    await s3.send(new PutBucketPolicyCommand({ Bucket: publicBucket, Policy: JSON.stringify(policy) }));
    console.log(`bucket ${publicBucket}: public read enabled`);
  } else {
    console.log(`R2 detected: enable public access for ${publicBucket} in the Cloudflare dashboard (custom domain or r2.dev).`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
