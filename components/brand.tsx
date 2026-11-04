import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The rhombus badge. Never recoloured, outlined or cropped; minimum 56px on screen. */
export function LogoBadge({ size = 64, className, priority }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/travelxm-logo.png"
      alt="TravelXM"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 select-none", className)}
    />
  );
}

/** Typographic name for places the badge does not fit (branding §4.7). */
export function Wordmark({ className, tone = "ink" }: { className?: string; tone?: "ink" | "cloudy" }) {
  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span className={cn("font-display text-[22px] tracking-[0.005em] uppercase", tone === "ink" ? "text-ink" : "text-cloudy")}>
        Travel XM
      </span>
      <span className={cn("xm-micro mt-1", tone === "ink" ? "text-primary" : "text-toucan")}>Academy</span>
    </span>
  );
}

export function BrandLink({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3", className)} aria-label="TravelXM Academy home">
      <LogoBadge size={56} />
      <Wordmark />
    </Link>
  );
}

/** Decorative cut-out (1–3 per composition, corners and edges only). */
export function Cutout({
  name,
  className,
  width,
  height,
}: {
  name: "toucan" | "macaw" | "sloth" | "frog";
  className?: string;
  width: number;
  height: number;
}) {
  return (
    <Image
      src={`/brand/cutouts/${name}.png`}
      alt=""
      aria-hidden
      width={width}
      height={height}
      className={cn("xm-cutout", className)}
    />
  );
}
