"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, FileText, Film, Folder, Image as ImageIcon, Search, X } from "lucide-react";
import { canDownload, displayName, driveDownload, driveOpen, drivePreview, driveThumbnail, fileKind, opensInGoogleOnly, type DriveItem } from "@/lib/hub/drive-links";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/surface";
import { cn, formatBytes } from "@/lib/utils";

const PAGE_SIZE = 48;

function FileGlyph({ mimeType }: { mimeType: string }) {
  const Icon = mimeType.startsWith("video/") ? Film : mimeType.startsWith("image/") ? ImageIcon : FileText;
  return <Icon aria-hidden className="size-8 stroke-[1.5] text-muted" />;
}

/** Google draws the picture. When it has none, the file type stands in. */
function Thumbnail({ item }: { item: DriveItem }) {
  const [failed, setFailed] = useState(false);
  if (failed || opensInGoogleOnly(item)) {
    return (
      <span className="grid size-full place-items-center">
        <FileGlyph mimeType={item.mimeType} />
      </span>
    );
  }
  return (
    // Served by Google straight to the browser; next/image would route every thumbnail through our server.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={driveThumbnail(item.id)}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="size-full object-cover transition-[scale] duration-500 ease-standard group-hover:scale-[1.03]"
    />
  );
}

function fileMeta(item: DriveItem) {
  return item.size ? `${fileKind(item.mimeType)}, ${formatBytes(item.size)}` : fileKind(item.mimeType);
}

function Preview({ item }: { item: DriveItem }) {
  return (
    <div>
      {opensInGoogleOnly(item) ? (
        <p className="rounded-md bg-sunken p-4 text-[16px] text-ink">This file cannot be shown here. It opens on Google in a new tab.</p>
      ) : item.mimeType.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={driveThumbnail(item.id, 1600)} alt={displayName(item.name)} referrerPolicy="no-referrer" className="mx-auto max-h-[62dvh] w-auto max-w-full rounded-md object-contain" />
      ) : (
        <iframe src={drivePreview(item.id)} title={displayName(item.name)} allow="autoplay; fullscreen" allowFullScreen className={cn("w-full rounded-md border-0 bg-sunken", item.mimeType.startsWith("video/") ? "aspect-video max-h-[62dvh]" : "h-[62dvh]")} />
      )}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {canDownload(item) ? (
          <Button asChild size="lg">
            <a href={driveDownload(item.id)} target="_blank" rel="noopener noreferrer">
              <Download aria-hidden /> Download
            </a>
          </Button>
        ) : (
          <Button asChild size="lg">
            <a href={driveOpen(item.id)} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden /> Open in Google (new tab)
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

/** One Drive folder inside the Hub: its subfolders, then its files, each opening in place. */
export function DriveBrowser({ items, basePath }: { items: DriveItem[]; basePath: string }) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<DriveItem | null>(null);

  const q = query.trim().toLowerCase();
  const matches = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  const folders = matches.filter((i) => i.isFolder);
  const files = matches.filter((i) => !i.isFolder);

  if (!items.length) {
    return <EmptyState icon={<Folder aria-hidden />} title="This folder is empty" body="New files appear here within a few minutes of being added to Drive." />;
  }

  return (
    <div>
      {items.length > 6 ? (
        <label className="relative mb-6 block md:max-w-md">
          <span className="sr-only">Search this folder</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 stroke-[1.75] text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this folder"
            className="h-12 w-full rounded-pill border border-control bg-card pr-12 pl-12 text-[16px] text-ink transition-colors duration-120 placeholder:text-muted focus-visible:border-ink"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 place-items-center rounded-pill text-muted hover:bg-sunken"
            >
              <X aria-hidden className="size-4 stroke-[2]" />
            </button>
          ) : null}
        </label>
      ) : null}

      {folders.length ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {folders.map((f) => (
            <li key={f.id}>
              <Link
                href={`${basePath}/${f.id}`}
                className="flex h-full min-h-[132px] flex-col rounded-lg border border-line bg-card p-4 transition-colors duration-200 ease-standard hover:border-ink"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-md bg-rose/15 text-ink">
                  <Folder aria-hidden className="size-6 stroke-[1.75]" />
                </span>
                <span className="mt-3 line-clamp-3 font-ui text-[17px] leading-tight font-semibold tracking-[-0.01em] text-ink">{displayName(f.name)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {files.length ? (
        <ul className={`grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-4 xl:grid-cols-4 ${folders.length ? "mt-8 md:mt-10" : ""}`}>
          {files.slice(0, visible).map((f) => (
            <li key={f.id}>
              <button type="button" onClick={() => setSelected(f)} className="group flex w-full flex-col rounded-lg text-left">
                <span className="block aspect-square w-full overflow-hidden rounded-lg bg-sunken">
                  <Thumbnail item={f} />
                </span>
                <span className="mt-2.5 line-clamp-2 px-0.5 font-ui text-[16px] leading-snug font-semibold break-words text-ink">{displayName(f.name)}</span>
                <span className="mt-0.5 px-0.5 text-[15px] text-muted">{fileMeta(f)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {files.length > visible ? (
        <div className="mt-8 text-center">
          <Button variant="secondary" size="lg" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            Show more ({files.length - visible} left)
          </Button>
        </div>
      ) : null}

      {q && !matches.length ? (
        <EmptyState icon={<Search aria-hidden />} title="Nothing matches" body="Try another word, or clear the search to see the whole folder." />
      ) : null}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        {selected ? (
          <DialogContent title={displayName(selected.name)} description={fileMeta(selected)} side="sheet" className="md:w-[min(1040px,calc(100vw-64px))] md:max-w-none">
            <Preview item={selected} />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
