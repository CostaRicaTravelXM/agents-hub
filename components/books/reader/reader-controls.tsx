"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";

/** Previous / Next, the page indicator, a slider and "Go to page". Swiping is never the only way. */
export function ReaderControls({
  label,
  page,
  step,
  pageCount,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onGoTo,
}: {
  label: string;
  page: number;
  step: number;
  pageCount: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (page: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [slider, setSlider] = useState<number | null>(null);
  const shown = slider ?? page;
  // The page changes on release: a long book should not render every page the thumb passes.
  const commitSlider = () => {
    if (slider === null) return;
    onGoTo(slider);
    setSlider(null);
  };

  return (
    <div className="xm-safe-bottom border-t border-line bg-page px-3 pt-2 pb-2 md:px-6">
      <div className="mx-auto grid max-w-[960px] grid-cols-[1fr_auto_1fr] items-center gap-x-3 sm:flex">
        <Button variant="secondary" size="lg" onClick={onPrev} disabled={!canPrev} aria-label="Back, previous page" className="h-14 w-full px-2 sm:w-auto sm:px-6 [@media(max-height:500px)]:h-11">
          <ChevronLeft aria-hidden /> <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Back</span>
        </Button>
        <div className="contents sm:block sm:min-w-0 sm:flex-1 sm:text-center">
          <p className="text-center font-ui text-[16px] font-semibold whitespace-nowrap text-ink tabular-nums" aria-live="polite">
            {slider !== null ? `Page ${slider} of ${pageCount}` : label}
          </p>
          <input
            type="range"
            className="xm-reader-range order-last col-span-3 mt-1 sm:order-none sm:mt-0.5"
            min={1}
            max={pageCount}
            step={step}
            value={shown}
            aria-label="Go to page"
            aria-valuetext={`Page ${shown} of ${pageCount}`}
            onChange={(e) => setSlider(Number(e.target.value))}
            onPointerUp={commitSlider}
            onKeyUp={commitSlider}
            onBlur={commitSlider}
          />
        </div>
        <Button size="lg" onClick={onNext} disabled={!canNext} aria-label="Next page" className="h-14 w-full px-2 sm:w-auto sm:px-6 [@media(max-height:500px)]:h-11">
          Next <ChevronRight aria-hidden />
        </Button>
      </div>
      <div className="mx-auto mt-1 flex max-w-[960px] justify-center [@media(max-height:500px)]:hidden">
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (o) setDraft(String(page));
          }}
        >
          <DialogTrigger className="h-11 rounded-md px-3 font-ui text-[15px] font-semibold text-link hover:bg-sunken hover:text-link-hover">Go to a page…</DialogTrigger>
          <DialogContent title="Go to page" description={`Type a number from 1 to ${pageCount}.`}>
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                const n = Number(draft);
                if (Number.isFinite(n) && n >= 1 && n <= pageCount) {
                  onGoTo(n);
                  setOpen(false);
                }
              }}
            >
              <Field label="Page number" htmlFor="goto-page">
                <Input id="goto-page" inputMode="numeric" pattern="[0-9]*" min={1} max={pageCount} value={draft} onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))} autoFocus />
              </Field>
              <Button type="submit" size="lg" block disabled={!draft || Number(draft) < 1 || Number(draft) > pageCount}>
                Go
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
