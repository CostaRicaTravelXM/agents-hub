import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type Profile = Tables<"profiles">;
export type Viewer = { id: string; email: string; profile: Profile };

/** The signed-in user and their profile, memoised per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const id = claims?.claims?.sub;
  if (!id) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) return null;
  return { id, email: profile.email, profile };
});

export async function requireViewer(next?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return viewer;
}

/** True until the account has a full name and has answered the agency question once. */
export function needsWelcome(profile: Pick<Profile, "first_name" | "last_name" | "hub_onboarded_at"> | null | undefined) {
  return !profile?.first_name || !profile?.last_name || !profile?.hub_onboarded_at;
}

export function isStaff(profile: Pick<Profile, "role"> | null | undefined) {
  return profile?.role === "admin" || profile?.role === "content_manager";
}

export function isAdmin(profile: Pick<Profile, "role"> | null | undefined) {
  return profile?.role === "admin";
}

export async function requireStaff(): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  if (!isStaff(viewer.profile)) redirect("/dashboard");
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  if (!isAdmin(viewer.profile)) redirect("/admin");
  return viewer;
}

export const ROLE_LABEL: Record<Profile["role"], string> = {
  agent: "Travel agent",
  content_manager: "Content manager",
  admin: "Admin",
};
