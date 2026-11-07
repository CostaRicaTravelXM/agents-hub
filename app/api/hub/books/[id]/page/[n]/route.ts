import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PAGE_WIDTHS, renderBookPage, type PageWidth } from "@/lib/hub/books-render";

export const maxDuration = 60;

/**
 * One page of a book as a WebP image. `?w=800|1600` picks the size (phones get
 * 800, retina screens 1600) and `?v=` carries the file version so the URL can
 * be cached for a year.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/hub/books/[id]/page/[n]">) {
  const { id, n } = await ctx.params;
  const page = Number(n);
  const requested = Number(request.nextUrl.searchParams.get("w") ?? 800);
  const width: PageWidth = (PAGE_WIDTHS as readonly number[]).includes(requested) ? (requested as PageWidth) : 800;
  if (!Number.isInteger(page) || page < 1 || page > 5000) return NextResponse.json({ error: "Bad page" }, { status: 400 });

  const supabase = await createClient();
  const { data: book } = await supabase.from("hub_books").select("id, file_key, file_version, page_count").eq("id", id).maybeSingle();
  if (!book?.file_key) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (book.page_count && page > book.page_count) return NextResponse.json({ error: "No such page" }, { status: 404 });

  try {
    const bytes = await renderBookPage(book, page, width);
    if (!bytes) return NextResponse.json({ error: "No such page" }, { status: 404 });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("book page render", e);
    return NextResponse.json({ error: "This page could not be rendered" }, { status: 500 });
  }
}
