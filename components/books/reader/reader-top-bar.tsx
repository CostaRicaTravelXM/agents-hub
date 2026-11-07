"use client";

import Link from "next/link";
import { ChevronLeft, Download, Maximize, Minimize, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

function BarButton({ label, onClick, active, children, className }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-2 rounded-pill px-3 font-ui text-[15px] font-semibold transition-colors duration-120 ease-standard [&_svg]:size-5 [&_svg]:stroke-[1.75]",
        active ? "bg-ink text-white" : "text-ink hover:bg-sunken",
        className,
      )}
    >
      {children}
      <span className="hidden md:inline">{label}</span>
      <span className="sr-only md:hidden">{label}</span>
    </button>
  );
}

export function ReaderTopBar({
  title,
  downloadHref,
  zoomed,
  onToggleZoom,
  fullscreenSupported,
  fullscreen,
  onToggleFullscreen,
}: {
  title: string;
  downloadHref: string;
  zoomed: boolean;
  onToggleZoom: () => void;
  fullscreenSupported: boolean;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  return (
    <header className="sticky bg-page top-0 z-20 border-b border-line pt-[env(safe-area-inset-top)]">
      <div className="flex h-16 items-center gap-2 px-3 md:px-6 [@media(max-height:500px)]:h-12">
        <Link href="/books" className="inline-flex h-11 shrink-0 items-center gap-1 rounded-pill px-2 font-ui text-[15px] font-semibold text-ink hover:bg-sunken">
          <ChevronLeft aria-hidden className="size-5 stroke-[2]" /> <span className="hidden sm:inline">Back to Books</span>
          <span className="sm:hidden">Books</span>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center font-ui text-[16px] font-semibold text-ink md:text-[18px]">{title}</h1>
        <div className="flex shrink-0 items-center gap-1">
          <BarButton label={zoomed ? "Normal size" : "Larger text"} onClick={onToggleZoom} active={zoomed}>
            {zoomed ? <ZoomOut aria-hidden /> : <ZoomIn aria-hidden />}
          </BarButton>
          {fullscreenSupported ? (
            <BarButton label={fullscreen ? "Exit full screen" : "Full screen"} onClick={onToggleFullscreen} className="hidden md:inline-flex">
              {fullscreen ? <Minimize aria-hidden /> : <Maximize aria-hidden />}
            </BarButton>
          ) : null}
          <a
            href={downloadHref}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-pill px-3 font-ui text-[15px] font-semibold text-ink transition-colors duration-120 hover:bg-sunken [&_svg]:size-5 [&_svg]:stroke-[1.75]"
          >
            <Download aria-hidden />
            <span className="hidden md:inline">Download PDF</span>
            <span className="sr-only md:hidden">Download PDF</span>
          </a>
        </div>
      </div>
    </header>
  );
}
