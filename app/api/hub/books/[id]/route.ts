import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedGetUrl } from "@/lib/storage";

/** The original PDF of a book, for "Download PDF" and for browsers without the reader. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/hub/books/[id]">) {
  const { id } = await ctx.params;
  const download = request.nextUrl.searchParams.get("mode") === "download";
  const supabase = await createClient();
  const { data: book } = await supabase.from("hub_books").select("file_key, file_name, title").eq("id", id).maybeSingle();
  if (!book?.file_key) return NextResponse.redirect(new URL("/books", request.url));
  const url = await signedGetUrl(book.file_key, { expiresIn: 600, inline: !download, downloadName: book.file_name ?? `${book.title}.pdf` });
  return NextResponse.redirect(url);
}
