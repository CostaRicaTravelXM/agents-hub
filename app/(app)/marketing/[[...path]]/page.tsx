import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, FolderOpen } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { env } from "@/lib/env";
import { DriveError, driveFolderId, resolveDrivePath, type DriveFolder } from "@/lib/hub/drive";
import { displayName } from "@/lib/hub/drive-links";
import { listLinks, type HubLink } from "@/lib/hub/queries";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { DriveBrowser } from "@/components/hub/drive-browser";
import { EmptyState } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Marketing Assets" };

const LEAD = "Photos, videos, logos and ready-made materials to use with your clients and on social media.";

function hostLabel(url: string) {
  try {
    const h = new URL(url).hostname;
    if (h.includes("google")) return "Google Drive";
    if (h.includes("dropbox")) return "Dropbox";
    if (h.includes("canva")) return "Canva";
    return h.replace(/^www\./, "");
  } catch {
    return "another website";
  }
}

/** Folders and pages that live outside the Hub. Also what everyone sees when Drive cannot be read here. */
function LinkTiles({ links }: { links: HubLink[] }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 md:gap-4">
      {links.map((l) => (
        <li key={l.id}>
          <a
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-full min-h-[112px] items-start gap-4 rounded-lg border border-line bg-card p-5 transition-colors duration-200 ease-standard hover:border-ink"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-md bg-rose/15 text-ink">
              <FolderOpen aria-hidden className="size-6 stroke-[1.75]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-ui text-[20px] leading-tight font-semibold text-ink">{l.title}</span>
              {l.description ? <span className="mt-1.5 block text-[16px] leading-snug text-muted">{l.description}</span> : null}
              <span className="mt-3 inline-flex items-center gap-1.5 font-ui text-[15px] font-semibold text-link">
                Opens {hostLabel(l.url)} in a new tab <ExternalLink aria-hidden className="size-4 stroke-[2]" />
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default async function MarketingPage({ params }: PageProps<"/marketing/[[...path]]">) {
  await requireViewer();
  const { path = [] } = await params;
  const links = await listLinks("marketing");

  const driveLink = links.find((l) => driveFolderId(l.url));
  const rootId = driveLink ? driveFolderId(driveLink.url) : null;
  const others = links.filter((l) => l !== driveLink);

  let folder: DriveFolder | null = null;
  let unavailable = false;
  if (rootId && env.googleDriveApiKey) {
    try {
      folder = await resolveDrivePath(rootId, path);
      if (!folder) notFound();
    } catch (e) {
      if (!(e instanceof DriveError)) throw e;
      console.error(e.message);
      unavailable = true;
    }
  }

  // Not set up yet, or Google did not answer: the folder still opens in a new tab.
  if (!folder) {
    if (path.length && !unavailable) notFound();
    return (
      <Page>
        <PageHeader title="Marketing Assets" lead={LEAD} />
        {unavailable ? (
          <p role="status" className="mb-5 rounded-lg bg-sunken p-4 text-[16px] text-ink">
            We could not load the files here just now. You can still open the folder directly.
          </p>
        ) : null}
        {links.length ? (
          <LinkTiles links={links} />
        ) : (
          <EmptyState icon={<FolderOpen aria-hidden />} title="No folders shared yet" body="The TravelXM team will add the marketing folder here." />
        )}
      </Page>
    );
  }

  const here = folder.crumbs.at(-1);
  const parent = folder.crumbs.at(-2);
  const basePath = ["/marketing", ...path].join("/");

  return (
    <Page>
      {here ? (
        <>
          <Link
            href={parent ? `/marketing/${path.slice(0, -1).join("/")}` : "/marketing"}
            className="inline-flex h-11 max-w-full items-center gap-1 rounded-pill bg-sunken pr-4 pl-2.5 font-ui text-[15px] font-semibold text-ink transition-colors duration-120 ease-standard hover:bg-line"
          >
            <ChevronLeft aria-hidden className="size-5 shrink-0 stroke-[2]" />
            <span className="truncate">{parent ? displayName(parent.name) : "Marketing Assets"}</span>
          </Link>
          <h1 className="xm-title mt-5 mb-6 md:mb-8">{displayName(here.name)}</h1>
        </>
      ) : (
        <PageHeader title="Marketing Assets" lead={LEAD} />
      )}

      <DriveBrowser key={basePath} items={folder.items} basePath={basePath} />

      {!here && others.length ? (
        <section aria-labelledby="more-heading" className="mt-10 md:mt-14">
          <h2 id="more-heading" className="xm-title-sm mb-4">
            More materials
          </h2>
          <LinkTiles links={others} />
        </section>
      ) : null}
    </Page>
  );
}
