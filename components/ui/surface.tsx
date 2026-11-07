import * as React from "react";
import { cn } from "@/lib/utils";

/* ---------- Card (branding §4.2) ---------- */
type CardVariant = "default" | "outlined" | "flat" | "inverse";
const cardVariants: Record<CardVariant, string> = {
  default: "bg-card shadow-card",
  outlined: "bg-card border border-line",
  flat: "bg-sunken",
  inverse: "bg-inverse text-cloudy [&_h1,&_h2,&_h3,&_h4]:text-cloudy",
};

export function Card({
  variant = "default",
  interactive,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant; interactive?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg",
        cardVariants[variant],
        interactive &&
          "group transition-[box-shadow] duration-200 ease-standard hover:shadow-raised",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 md:p-6", className)} {...props} />;
}

/* ---------- Badge ---------- */
type Tone = "neutral" | "primary" | "success" | "info" | "warning" | "highlight" | "playful" | "danger" | "inverse";
const badgeTones: Record<Tone, string> = {
  neutral: "bg-sunken text-ink",
  primary: "bg-primary text-white",
  success: "bg-olive/15 text-ink",
  info: "bg-turquoise text-black",
  warning: "bg-toucan text-black",
  highlight: "bg-sunset text-black",
  playful: "bg-rose text-black",
  danger: "bg-danger text-white",
  inverse: "bg-inverse text-white",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1 rounded-pill px-3 font-ui text-[15px] font-semibold [&_svg]:size-4 [&_svg]:stroke-[2]",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

/* ---------- Tag (pill) ---------- */
export function Tag({
  active,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3.5 py-1 font-ui text-[15px] font-medium transition-colors duration-120 ease-standard",
        active ? "bg-ink text-white" : "bg-sunken text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function StatusDot({ tone = "success", className }: { tone?: "success" | "warning" | "danger" | "info" | "muted"; className?: string }) {
  const map = { success: "bg-olive", warning: "bg-toucan", danger: "bg-danger", info: "bg-turquoise", muted: "bg-control" };
  return <span aria-hidden className={cn("inline-block size-2 rounded-pill", map[tone], className)} />;
}

/* ---------- Photo slot placeholder (branding §4.5) ---------- */
export function PhotoSlot({
  label,
  tone = "light",
  className,
}: {
  label: string;
  tone?: "light" | "dark" | "forest";
  className?: string;
}) {
  return (
    <div className={cn("xm-photo-slot", tone === "dark" && "is-dark", tone === "forest" && "is-forest", className)}>
      <span className="xm-photo-slot__label">{label}</span>
    </div>
  );
}

/* ---------- Progress ---------- */
export function ProgressBar({
  value,
  className,
  tone = "primary",
  label,
}: {
  value: number;
  className?: string;
  tone?: "primary" | "toucan" | "cloudy";
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const fill = tone === "toucan" ? "bg-toucan" : tone === "cloudy" ? "bg-cloudy" : "bg-primary";
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={label ?? "Progress"}
      className={cn("h-2 w-full overflow-hidden rounded-pill bg-black/10", className)}
    >
      <div
        className={cn("h-full rounded-pill transition-[width] duration-[340ms] ease-standard", fill)}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 56,
  stroke = 5,
  className,
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: React.ReactNode;
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={label ?? "Progress"}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-black/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          className="text-primary transition-[stroke-dashoffset] duration-[340ms] ease-standard"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {children ?? <span className="font-ui text-[15px] font-semibold text-ink">{Math.round(v)}%</span>}
      </div>
    </div>
  );
}

/* ---------- Section heading ---------- */
export function SectionHeading({
  title,
  action,
  className,
  id,
  as: As = "h2",
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
  id?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <As id={id} className="xm-title-sm">
          {title}
        </As>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({
  title,
  body,
  action,
  icon,
  className,
}: {
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-lg bg-sunken px-6 py-12 text-center", className)}>
      {icon ? <div className="mb-4 grid size-12 place-items-center rounded-pill bg-white text-ink [&_svg]:size-5 [&_svg]:stroke-[1.75]">{icon}</div> : null}
      <p className="xm-subtitle-sm">{title}</p>
      {body ? <p className="mt-2 max-w-md text-copy-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("xm-skeleton", className)} />;
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-line", className)} />;
}
