import "server-only";
import { generateHTML } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";
import type { Json } from "@/lib/database.types";

/** Lesson bodies are stored as Tiptap JSON; rendering from JSON means stored HTML is never trusted. */
export function renderRichText(doc: Json | null | undefined): string {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return "";
  try {
    return generateHTML(doc as Record<string, unknown>, [
      StarterKit.configure({
        link: { openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
        heading: { levels: [2, 3] },
      }),
    ]);
  } catch {
    return "";
  }
}
