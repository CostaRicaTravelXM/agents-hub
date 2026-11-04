"use client";

import * as React from "react";
import { Checkbox as RCheckbox, RadioGroup as RRadio, Select as RSelect, Switch as RSwitch } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-md border-2 border-line bg-card px-3.5 text-copy-sm text-ink placeholder:text-muted " +
  "transition-[border-color,box-shadow] duration-120 ease-standard hover:border-[#cfc6b1] " +
  "focus-visible:border-secondary focus-visible:outline-none focus-visible:ring-0 " +
  "aria-[invalid=true]:border-danger disabled:opacity-[.42]";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(control, "h-12", className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(control, "min-h-24 py-3 leading-[1.55]", className)} {...props} />;
  },
);

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block font-ui text-[14px] font-semibold text-ink", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
  optional,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | null;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional ? <span className="ml-1.5 font-normal text-muted">optional</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-[14px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[14px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---------- Native select, styled (best on mobile) ---------- */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function NativeSelect({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select ref={ref} className={cn(control, "h-12 appearance-none pr-10", className)} {...props}>
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 stroke-[1.75] text-muted"
        />
      </div>
    );
  },
);

/* ---------- Radix select ---------- */
export function Select({
  value,
  defaultValue,
  onValueChange,
  name,
  placeholder,
  options,
  className,
  id,
  disabled,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  name?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  className?: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <RSelect.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} name={name} disabled={disabled}>
      <RSelect.Trigger id={id} className={cn(control, "flex h-12 items-center justify-between gap-2 text-left", className)}>
        <RSelect.Value placeholder={placeholder} />
        <RSelect.Icon>
          <ChevronDown className="size-5 stroke-[1.75] text-muted" aria-hidden />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-80 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg bg-card shadow-raised"
        >
          <RSelect.Viewport className="p-1.5">
            {options.map((o) => (
              <RSelect.Item
                key={o.value}
                value={o.value}
                className="relative flex h-10 cursor-pointer items-center rounded-md pr-3 pl-9 text-copy-sm text-ink outline-none select-none data-[highlighted]:bg-sunken"
              >
                <RSelect.ItemIndicator className="absolute left-2.5">
                  <Check className="size-4 stroke-[2] text-primary" aria-hidden />
                </RSelect.ItemIndicator>
                <RSelect.ItemText>{o.label}</RSelect.ItemText>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}

/* ---------- Checkbox ---------- */
export function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof RCheckbox.Root>) {
  return (
    <RCheckbox.Root
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-sm border-2 border-line-strong bg-card transition-colors duration-120 ease-standard",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:opacity-[.42]",
        className,
      )}
      {...props}
    >
      <RCheckbox.Indicator>
        <Check className="size-3.5 stroke-[3] text-white" aria-hidden />
      </RCheckbox.Indicator>
    </RCheckbox.Root>
  );
}

/* ---------- Radio ---------- */
export const RadioGroup = RRadio.Root;
export function Radio({ className, ...props }: React.ComponentProps<typeof RRadio.Item>) {
  return (
    <RRadio.Item
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-pill border-2 border-line-strong bg-card transition-colors duration-120 ease-standard",
        "data-[state=checked]:border-primary disabled:opacity-[.42]",
        className,
      )}
      {...props}
    >
      <RRadio.Indicator className="size-2.5 rounded-pill bg-primary" />
    </RRadio.Item>
  );
}

/* ---------- Switch ---------- */
export function Switch({ className, ...props }: React.ComponentProps<typeof RSwitch.Root>) {
  return (
    <RSwitch.Root
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill bg-[#cfc6b1] transition-colors duration-200 ease-standard",
        "data-[state=checked]:bg-primary disabled:opacity-[.42]",
        className,
      )}
      {...props}
    >
      <RSwitch.Thumb className="block size-5 translate-x-0.5 rounded-pill bg-white shadow-card transition-transform duration-200 ease-standard data-[state=checked]:translate-x-[22px]" />
    </RSwitch.Root>
  );
}
