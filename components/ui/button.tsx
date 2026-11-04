import * as React from "react";
import { Slot } from "radix-ui";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "solid" | "secondary" | "ghost" | "inverse" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-ui font-semibold " +
  "transition-[background-color,color,border-color,box-shadow,transform] duration-120 ease-standard " +
  "active:translate-y-px disabled:opacity-[.42] aria-disabled:opacity-[.42] disabled:active:translate-y-0 " +
  "[&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:stroke-[1.75]";

const variants: Record<Variant, string> = {
  solid: "bg-primary text-on-accent hover:bg-primary-hover active:bg-primary-press",
  secondary:
    "border-2 border-line-strong bg-transparent text-ink hover:bg-sunken active:bg-sunken",
  ghost: "bg-transparent text-ink hover:bg-sunken active:bg-sunken",
  inverse: "bg-cloudy text-ink hover:bg-white active:bg-sunken",
  danger: "border-2 border-danger bg-transparent text-danger hover:bg-sunken",
  link: "h-auto px-0 text-link underline underline-offset-4 hover:text-link-hover active:translate-y-0",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-[14px]",
  md: "h-11 px-5 text-ui",
  lg: "h-13 px-7 text-[16px]",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  loading?: boolean;
  block?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "solid", size = "md", asChild, loading, block, children, disabled, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      ref={ref}
      className={cn(base, variants[variant], variant !== "link" && sizes[size], block && "w-full", className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
          {children}
        </>
      )}
    </Comp>
  );
});

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: "ghost" | "secondary" | "solid" | "inverse";
  size?: "sm" | "md";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, variant = "ghost", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        base,
        variants[variant],
        size === "md" ? "size-11" : "size-9",
        "px-0",
        className,
      )}
      {...props}
    />
  );
});
