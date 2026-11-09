/** The FAM trip segments. Pure, so client forms can import it. Keep in sync with the check on hub_fam_trips.segments. */
export const FAM_SEGMENTS: { key: string; label: string }[] = [
  { key: "classic", label: "Classic" },
  { key: "luxury", label: "Luxury" },
  { key: "romance", label: "Romance" },
  { key: "wellness", label: "Wellness" },
  { key: "adventure", label: "Adventure" },
  { key: "family", label: "Family" },
  { key: "groups", label: "Groups & MICE" },
  { key: "business", label: "Business" },
];
export const FAM_SEGMENT_LABEL: Record<string, string> = Object.fromEntries(FAM_SEGMENTS.map((s) => [s.key, s.label]));

/** What agents read for when a trip runs. No label means the dates aren't set yet. */
export function famTripTiming(trip: { timing_label: string | null }) {
  return trip.timing_label?.trim() || "Dates to be confirmed";
}
