import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

/** Sets up rows a test needs against the local stack. Next reads these values from the same file. */
export function adminClient() {
  const env = readFileSync(".env.local", "utf8");
  const read = (name: string) => env.match(new RegExp(`^${name}=(.*?)\r?$`, "m"))?.[1] ?? "";
  return createClient(read("NEXT_PUBLIC_SUPABASE_URL"), read("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
}
