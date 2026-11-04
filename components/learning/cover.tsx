import Image from "next/image";
import { mediaUrl } from "@/lib/media";
import { PhotoSlot } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/** Course / module / poster photo with the branded placeholder when missing. */
export function Cover({
  imageKey,
  alt,
  label = "Course photo",
  sizes = "(min-width: 1024px) 400px, 100vw",
  priority,
  zoomOnHover,
  tone = "light",
  className,
}: {
  imageKey: string | null | undefined;
  alt: string;
  label?: string;
  sizes?: string;
  priority?: boolean;
  zoomOnHover?: boolean;
  tone?: "light" | "dark" | "forest";
  className?: string;
}) {
  const src = mediaUrl(imageKey);
  if (!src) return <PhotoSlot label={label} tone={tone} className={cn("absolute inset-0", className)} />;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn(
        "object-cover",
        zoomOnHover && "transition-transform duration-[340ms] ease-standard group-hover:scale-[1.04]",
        className,
      )}
    />
  );
}
