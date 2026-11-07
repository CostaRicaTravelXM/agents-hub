"use client";

import { Toaster as Sonner, toast as sonner } from "sonner";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "info" | "warning" | "danger";

const toneGlyph: Record<Tone, string> = {
  success: "bg-olive text-white",
  info: "bg-turquoise text-black",
  warning: "bg-toucan text-black",
  danger: "bg-danger text-white",
};
const icons = { success: CircleCheck, info: Info, warning: TriangleAlert, danger: CircleAlert };

/** Brand toast: a circular tone glyph and plain words. */
function BrandToast({
  id,
  tone,
  title,
  description,
  action,
}: {
  id: string | number;
  tone: Tone;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  const Icon = icons[tone];
  return (
    <div className="relative flex w-[min(440px,calc(100vw-32px))] items-start gap-3 overflow-hidden rounded-lg bg-card py-3.5 pr-4 pl-4 shadow-raised">
      <span aria-hidden className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-pill", toneGlyph[tone])}>
        <Icon className="size-4 stroke-[2]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-ui text-[15px] font-semibold text-ink">{title}</p>
        {description ? <p className="mt-0.5 text-[15px] leading-snug text-muted">{description}</p> : null}
      </div>
      {action ? (
        <button
          type="button"
          onClick={() => {
            action.onClick();
            sonner.dismiss(id);
          }}
          className="inline-flex min-h-11 shrink-0 items-center self-center rounded-md px-2 font-ui text-[15px] font-semibold text-link hover:text-link-hover"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

function show(tone: Tone, title: string, opts?: { description?: string; action?: { label: string; onClick: () => void }; duration?: number; position?: "top-center" | "bottom-center" }) {
  return sonner.custom((id) => <BrandToast id={id} tone={tone} title={title} description={opts?.description} action={opts?.action} />, {
    duration: opts?.duration ?? 4200,
    position: opts?.position,
  });
}

export const notify = {
  success: (title: string, opts?: Parameters<typeof show>[2]) => show("success", title, opts),
  info: (title: string, opts?: Parameters<typeof show>[2]) => show("info", title, opts),
  warning: (title: string, opts?: Parameters<typeof show>[2]) => show("warning", title, opts),
  error: (title: string, opts?: Parameters<typeof show>[2]) => show("danger", title, opts),
};

export function Toaster() {
  return <Sonner position="bottom-center" offset={{ bottom: 96 }} mobileOffset={{ bottom: 96 }} toastOptions={{ unstyled: true }} />;
}
