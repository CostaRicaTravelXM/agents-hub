import * as React from "react";
import { Slot } from "radix-ui";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "solid" | "ink" | "secondary" | "ghost" | "inverse" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-pill font-ui font-semibold " +
  "transition-[background-color,color,border-color,box-shadow,scale] duration-120 ease-standard " +
  "active:scale-[.98] disabled:opacity-[.42] aria-disabled:opacity-[.42] disabled:active:scale-100 " +
  "[&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:stroke-[1.75]";

const variants: Record<Variant, string> = {
  solid: "bg-primary text-on-accent hover:bg-primary-hover active:bg-primary-press",
  ink: "bg-ink text-white hover:bg-stone",
  secondary: "border border-control bg-card text-ink hover:border-ink hover:bg-sunken active:bg-sunken",
  ghost: "bg-transparent text-ink hover:bg-sunken active:bg-sunken",
  inverse: "bg-white text-ink hover:bg-sunken active:bg-sunken",
  danger: "border border-danger bg-card text-danger hover:bg-sunken",
  link: "h-auto px-0 text-link underline underline-offset-4 hover:text-link-hover active:scale-100",
};

const sizes: Record<Size, string> = {
  sm: "h-11 px-4 text-[15px]",
  md: "h-12 px-6 text-[16px]",
  lg: "h-14 px-8 text-[17px]",
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
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, variant = "ghost", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        base,
        variants[variant],
        "size-11",
        "px-0",
        className,
      )}
      {...props}
    />
  );
});
