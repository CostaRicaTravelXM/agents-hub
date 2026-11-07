import { Download, ExternalLink } from "lucide-react";
import type { Tables } from "@/lib/database.types";
import { formatBytes } from "@/lib/utils";

type Resource = Pick<Tables<"resources">, "id" | "title" | "description" | "file_key" | "file_size" | "file_mime" | "external_url">;

function kind(r: Resource) {
  if (r.external_url && !r.file_key) return "Link";
  if (r.file_mime === "application/pdf") return "PDF";
  return "File";
}

export function ResourceList({ resources }: { resources: Resource[] }) {
  return (
    <ul className="divide-y divide-line">
      {resources.map((r) => {
        const isLink = Boolean(r.external_url && !r.file_key);
        return (
          <li key={r.id}>
            <a
              href={`/api/resources/${r.id}`}
              target={isLink ? "_blank" : undefined}
              rel={isLink ? "noopener noreferrer" : undefined}
              className="group flex min-h-14 items-center gap-3 py-3 transition-colors duration-120"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-md bg-sunken text-ink transition-colors duration-120 group-hover:bg-primary group-hover:text-white">
                {isLink ? <ExternalLink aria-hidden className="size-4 stroke-[2]" /> : <Download aria-hidden className="size-4 stroke-[2]" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-ui text-[15px] font-semibold text-ink group-hover:text-link">{r.title}</span>
                <span className="block truncate text-[15px] text-muted">
                  {kind(r)}
                  {r.file_size ? `, ${formatBytes(r.file_size)}` : ""}
                  {r.description ? `. ${r.description}` : ""}
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
