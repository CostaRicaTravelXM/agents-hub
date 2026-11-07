"use client";

import * as React from "react";
import { AlertDialog as RAlert, Dialog as RDialog, DropdownMenu as RMenu, Tabs as RTabs, Tooltip as RTooltip } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- Dialog / Sheet ---------- */
export const Dialog = RDialog.Root;
export const DialogTrigger = RDialog.Trigger;
export const DialogClose = RDialog.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
  side,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  /**
   * "sheet" slides up from the bottom on mobile, centered dialog on desktop.
   * "panel" slides up on a phone and in from the right on larger screens.
   */
  side?: "center" | "sheet" | "right" | "panel";
}) {
  const layout =
    side === "panel"
      ? "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-xl data-[state=open]:animate-[xm-slide-up_340ms_var(--ease-standard)] md:inset-x-auto md:inset-y-0 md:right-0 md:h-full md:max-h-none md:w-[440px] md:rounded-t-none md:rounded-l-xl md:data-[state=open]:animate-[xm-slide-left_340ms_var(--ease-standard)]"
      : side === "right"
      ? "inset-y-0 right-0 h-full w-[min(420px,100vw)] rounded-l-xl data-[state=open]:animate-[xm-slide-left_340ms_var(--ease-standard)]"
      : side === "sheet"
        ? "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-xl md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:w-[min(560px,calc(100vw-32px))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg data-[state=open]:animate-[xm-slide-up_340ms_var(--ease-standard)] md:data-[state=open]:animate-[xm-pop_200ms_var(--ease-standard)]"
        : "top-1/2 left-1/2 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-lg data-[state=open]:animate-[xm-pop_200ms_var(--ease-standard)]";
  return (
    <RDialog.Portal>
      <RDialog.Overlay className="xm-scrim fixed inset-0 z-50 data-[state=open]:animate-[xm-fade_200ms_var(--ease-standard)]" />
      <RDialog.Content
        className={cn("fixed z-50 flex flex-col overflow-hidden bg-card shadow-raised outline-none", layout, className)}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 md:px-6">
          <div className="min-w-0">
            <RDialog.Title className="xm-subtitle-sm">{title}</RDialog.Title>
            {description ? (
              <RDialog.Description className="mt-1 text-[15px] text-muted">{description}</RDialog.Description>
            ) : (
              <RDialog.Description className="sr-only">{title}</RDialog.Description>
            )}
          </div>
          <RDialog.Close
            aria-label="Close"
            className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-pill bg-sunken text-ink transition-colors duration-120 ease-standard hover:bg-line"
          >
            <X className="size-5 stroke-[1.75]" aria-hidden />
          </RDialog.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-6 md:px-6">{children}</div>
      </RDialog.Content>
    </RDialog.Portal>
  );
}

/* ---------- Confirm (alert dialog) ---------- */
export function Confirm({
  trigger,
  title,
  body,
  confirmLabel = "Confirm",
  destructive,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  body?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  return (
    <RAlert.Root open={open} onOpenChange={setOpen}>
      <RAlert.Trigger asChild>{trigger}</RAlert.Trigger>
      <RAlert.Portal>
        <RAlert.Overlay className="xm-scrim fixed inset-0 z-50 data-[state=open]:animate-[xm-fade_200ms_var(--ease-standard)]" />
        <RAlert.Content className="fixed top-1/2 left-1/2 z-50 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card p-6 shadow-raised data-[state=open]:animate-[xm-pop_200ms_var(--ease-standard)]">
          <RAlert.Title className="xm-subtitle-sm">{title}</RAlert.Title>
          {body ? <RAlert.Description className="mt-2 text-[15px] text-muted">{body}</RAlert.Description> : null}
          <div className="mt-6 flex justify-end gap-3">
            <RAlert.Cancel className="inline-flex h-12 items-center rounded-pill px-5 font-ui text-[16px] font-semibold text-ink transition-colors duration-120 ease-standard hover:bg-sunken">
              Cancel
            </RAlert.Cancel>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await onConfirm();
                  setOpen(false);
                })
              }
              className={cn(
                "inline-flex h-12 items-center rounded-pill px-5 font-ui text-[16px] font-semibold transition-colors duration-120 ease-standard active:translate-y-px disabled:opacity-[.42]",
                destructive ? "bg-danger text-white hover:bg-[#a84e2b]" : "bg-primary text-white hover:bg-primary-hover",
              )}
            >
              {pending ? "Working…" : confirmLabel}
            </button>
          </div>
        </RAlert.Content>
      </RAlert.Portal>
    </RAlert.Root>
  );
}

/* ---------- Tabs ---------- */
export const Tabs = RTabs.Root;
export function TabsList({ className, ...props }: React.ComponentProps<typeof RTabs.List>) {
  return (
    <RTabs.List
      className={cn("scrollbar-none flex gap-6 overflow-x-auto border-b border-line", className)}
      {...props}
    />
  );
}
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof RTabs.Trigger>) {
  return (
    <RTabs.Trigger
      className={cn(
        "relative -mb-px h-11 shrink-0 font-ui text-[15px] font-semibold text-muted transition-colors duration-120 ease-standard hover:text-ink",
        "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 after:ease-standard",
        "data-[state=active]:text-ink data-[state=active]:after:scale-x-100",
        className,
      )}
      {...props}
    />
  );
}
export const TabsContent = RTabs.Content;

/* ---------- Tooltip ---------- */
export function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return (
    <RTooltip.Provider delayDuration={300}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content
            sideOffset={6}
            className="z-50 max-w-60 rounded-md bg-inverse px-2.5 py-1.5 text-[15px] text-cloudy shadow-raised data-[state=delayed-open]:animate-[xm-fade_120ms_var(--ease-standard)]"
          >
            {content}
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}

/* ---------- Dropdown menu ---------- */
export const Menu = RMenu.Root;
export const MenuTrigger = RMenu.Trigger;
export function MenuContent({ className, ...props }: React.ComponentProps<typeof RMenu.Content>) {
  return (
    <RMenu.Portal>
      <RMenu.Content
        sideOffset={8}
        align="end"
        className={cn(
          "z-50 min-w-52 rounded-lg bg-card p-1.5 shadow-raised data-[state=open]:animate-[xm-pop_120ms_var(--ease-standard)]",
          className,
        )}
        {...props}
      />
    </RMenu.Portal>
  );
}
export function MenuItem({ className, ...props }: React.ComponentProps<typeof RMenu.Item>) {
  return (
    <RMenu.Item
      className={cn(
        "flex h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 text-[15px] text-ink outline-none select-none data-[highlighted]:bg-sunken [&_svg]:size-5 [&_svg]:stroke-[1.75] [&_svg]:text-muted",
        className,
      )}
      {...props}
    />
  );
}
export const MenuSeparator = () => <RMenu.Separator className="my-1 h-px bg-line" />;
