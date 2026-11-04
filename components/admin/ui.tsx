import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="mb-3 inline-flex items-center gap-1 font-ui text-[14px] font-semibold text-link hover:text-link-hover">
            <ChevronLeft aria-hidden className="size-4 stroke-[2]" /> {back.label}
          </Link>
        ) : null}
        <h1 className="xm-title-sm break-words">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-[15px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

/** Dense data tables use Be Vietnam Pro (branding: alternate body face for dense UI). */
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-lg bg-card shadow-card", className)}>
      <table className="w-full min-w-[640px] border-collapse font-alt text-[14px] text-body">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("border-b border-line px-4 py-3 text-left font-ui text-[11px] font-semibold tracking-[0.12em] whitespace-nowrap text-muted uppercase", className)}>
      {children}
    </th>
  );
}
export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("border-b border-line px-4 py-3 align-middle", className)}>{children}</td>;
}

export function Panel({ title, description, actions, children, className }: { title?: string; description?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg bg-card p-5 shadow-card md:p-6", className)}>
      {title ? (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-ui text-[18px] font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-1 text-[14px] text-muted">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Kpi({ label, value, detail, className }: { label: string; value: string | number; detail?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg bg-card p-5 shadow-card", className)}>
      <p className="xm-micro text-muted">{label}</p>
      <p className="mt-2.5 font-display text-[36px] leading-none text-ink md:text-[40px]">{value}</p>
      {detail ? <p className="mt-2 text-[13px] text-muted">{detail}</p> : null}
    </div>
  );
}
