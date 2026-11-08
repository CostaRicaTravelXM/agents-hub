import { readFileSync } from "node:fs";
import { S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

function localEnv() {
  const env = readFileSync(".env.local", "utf8");
  return (name: string) => env.match(new RegExp(`^${name}=(.*?)\r?$`, "m"))?.[1] ?? "";
}

/** Sets up rows a test needs against the local stack. Next reads these values from the same file. */
export function adminClient() {
  const read = localEnv();
  return createClient(read("NEXT_PUBLIC_SUPABASE_URL"), read("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
}

/** The local media storage (RustFS), to check what an upload actually stored. */
export function storageClient() {
  const read = localEnv();
  const client = new S3Client({
    region: read("R2_REGION") || "auto",
    endpoint: read("R2_ENDPOINT"),
    credentials: { accessKeyId: read("R2_ACCESS_KEY_ID"), secretAccessKey: read("R2_SECRET_ACCESS_KEY") },
    forcePathStyle: read("R2_FORCE_PATH_STYLE") === "true",
  });
  return { client, buckets: { private: read("R2_PRIVATE_BUCKET") || "academy-private", public: read("R2_PUBLIC_BUCKET") || "academy-public" } };
}
