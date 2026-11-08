import { describe, expect, it } from "vitest";
import { nonLocalTargets } from "../../scripts/local-only.mts";

describe("the demo seed stays local", () => {
  it("accepts the local stack", () => {
    expect(nonLocalTargets({ supabase: "http://127.0.0.1:54321", storage: "http://localhost:9000" })).toEqual([]);
  });

  it("names every target that is not on this machine", () => {
    expect(
      nonLocalTargets({ supabase: "https://abcd.supabase.co", storage: "https://acct.r2.cloudflarestorage.com", other: "http://localhost:1" }),
    ).toEqual(["supabase", "storage"]);
    expect(nonLocalTargets({ supabase: "not a url" })).toEqual(["supabase"]);
  });
});
