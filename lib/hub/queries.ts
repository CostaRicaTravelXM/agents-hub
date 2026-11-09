import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type FamTrip = Tables<"hub_fam_trips">;
export type Offer = Tables<"hub_offers">;
export type Book = Tables<"hub_books">;
export type HubLink = Tables<"hub_links">;

function today() {
  return new Date().toISOString().slice(0, 10);
}

/* ---------- FAM trips ---------- */
export const listFamTrips = cache(async (): Promise<FamTrip[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("hub_fam_trips").select("*").eq("status", "published").order("sort_order").order("created_at");
  return data ?? [];
});

export const getFamTrip = cache(async (slug: string): Promise<FamTrip | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("hub_fam_trips").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return data;
});

export type FamTripAccess = { groupOnly: boolean; canApply: boolean; groupNames: string[] };

/** Whether the viewer may fill in the trip's interest form. Group trips are open to their groups' members only. */
export const getFamTripAccess = cache(async (tripId: string): Promise<FamTripAccess> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fam_trip_access", { p_trip: tripId });
  const row = data?.[0];
  if (!row) return { groupOnly: false, canApply: false, groupNames: [] };
  return { groupOnly: row.group_only, canApply: row.can_apply, groupNames: row.group_names ?? [] };
});

/* ---------- Current offers ---------- */
/** Published offers that have started and not ended. RLS already hides expired ones from agents. */
export const listCurrentOffers = cache(async (): Promise<Offer[]> => {
  const supabase = await createClient();
  const t = today();
  const { data } = await supabase
    .from("hub_offers")
    .select("*")
    .eq("status", "published")
    .or(`valid_from.is.null,valid_from.lte.${t}`)
    .or(`valid_until.is.null,valid_until.gte.${t}`)
    .order("sort_order")
    .order("created_at");
  return data ?? [];
});

export const getOffer = cache(async (slug: string): Promise<Offer | null> => {
  const supabase = await createClient();
  const t = today();
  const { data } = await supabase
    .from("hub_offers")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .or(`valid_from.is.null,valid_from.lte.${t}`)
    .or(`valid_until.is.null,valid_until.gte.${t}`)
    .maybeSingle();
  return data;
});

/* ---------- Books ---------- */
export const listBooks = cache(async (userId: string): Promise<(Book & { lastPage: number | null })[]> => {
  const supabase = await createClient();
  const [{ data: books }, { data: progress }] = await Promise.all([
    supabase.from("hub_books").select("*").eq("status", "published").order("sort_order").order("created_at"),
    supabase.from("hub_book_progress").select("book_id, page").eq("user_id", userId),
  ]);
  const byBook = new Map((progress ?? []).map((p) => [p.book_id, p.page]));
  return (books ?? []).map((b) => ({ ...b, lastPage: byBook.get(b.id) ?? null }));
});

export const getBook = cache(async (slug: string): Promise<Book | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("hub_books").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return data;
});

export async function getBookProgress(userId: string, bookId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("hub_book_progress").select("page").eq("user_id", userId).eq("book_id", bookId).maybeSingle();
  return data?.page ?? null;
}

/* ---------- Links ---------- */
export const listLinks = cache(async (group: "marketing" | "home"): Promise<HubLink[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("hub_links").select("*").eq("group_key", group).order("sort_order").order("created_at");
  return data ?? [];
});

/* ---------- Home tiles ---------- */
export type HubCounts = { famTrips: number; offers: number; books: number };

export const hubCounts = cache(async (): Promise<HubCounts> => {
  const supabase = await createClient();
  const t = today();
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  const [famTrips, offers, books] = await Promise.all([
    count(supabase.from("hub_fam_trips").select("id", { count: "exact", head: true }).eq("status", "published")),
    count(
      supabase
        .from("hub_offers")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .or(`valid_from.is.null,valid_from.lte.${t}`)
        .or(`valid_until.is.null,valid_until.gte.${t}`),
    ),
    count(supabase.from("hub_books").select("id", { count: "exact", head: true }).eq("status", "published")),
  ]);
  return { famTrips, offers, books };
});
