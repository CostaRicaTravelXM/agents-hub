"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteLink, saveLink } from "@/app/actions/hub-admin";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/form";
import { Confirm, Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/surface";
import { notify } from "@/components/ui/toast";
import type { Tables } from "@/lib/database.types";

type HubLink = Tables<"hub_links">;
const GROUP_LABEL: Record<string, string> = { marketing: "Marketing Assets", home: "Home" };

function LinkForm({ link, onDone }: { link?: HubLink; onDone: () => void }) {
  const [group, setGroup] = useState<"marketing" | "home">((link?.group_key as "marketing" | "home") ?? "marketing");
  const [title, setTitle] = useState(link?.title ?? "");
  const [description, setDescription] = useState(link?.description ?? "");
  const [url, setUrl] = useState(link?.url ?? "");
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveLink(link?.id ?? null, { group_key: group, title, description, url });
          if (!r.ok) return void notify.error("Not saved", { description: r.error });
          notify.success(link ? "Link saved" : "Link added");
          onDone();
        });
      }}
    >
      <Field label="Shown in" htmlFor="l-group">
        <NativeSelect id="l-group" value={group} onChange={(e) => setGroup(e.target.value as "marketing" | "home")}>
          <option value="marketing">Marketing Assets</option>
          <option value="home">Home</option>
        </NativeSelect>
      </Field>
      <Field label="Name" htmlFor="l-title">
        <Input id="l-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
      </Field>
      <Field label="Description" htmlFor="l-desc" optional hint="One line saying what agents will find.">
        <Input id="l-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
      </Field>
      <Field label="Link" htmlFor="l-url" hint="A Google Drive folder, a Canva page… It opens in a new tab.">
        <Input id="l-url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} />
      </Field>
      <Button type="submit" loading={pending} disabled={title.trim().length < 2 || !/^https?:\/\//.test(url)}>
        Save link
      </Button>
    </form>
  );
}

export function LinksEditor({ links }: { links: HubLink[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div>
      <div className="mb-5">
        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogTrigger asChild>
            <Button>
              <Plus aria-hidden /> New link
            </Button>
          </DialogTrigger>
          <DialogContent title="New link" description="A folder or page agents should be able to open from the Hub." side="sheet">
            <LinkForm onDone={() => setAdding(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {links.map((l) => (
          <li key={l.id} className="flex items-start gap-4 rounded-lg bg-card p-5 shadow-card">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-sunken text-body">
              <Link2 aria-hidden className="size-5 stroke-[1.75]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-ui text-[16px] font-semibold text-ink">{l.title}</p>
              {l.description ? <p className="mt-0.5 text-[14px] text-muted">{l.description}</p> : null}
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="xm-link mt-1 inline-flex max-w-full items-center gap-1 truncate text-[13px]">
                <span className="truncate">{l.url}</span> <ExternalLink aria-hidden className="size-3.5 shrink-0 stroke-[2]" />
              </a>
              <div className="mt-2">
                <Badge tone="neutral">{GROUP_LABEL[l.group_key] ?? l.group_key}</Badge>
              </div>
            </div>
            <Dialog open={editing === l.id} onOpenChange={(o) => setEditing(o ? l.id : null)}>
              <DialogTrigger aria-label={`Edit ${l.title}`} className="grid size-9 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink">
                <Pencil aria-hidden className="size-4 stroke-[2]" />
              </DialogTrigger>
              <DialogContent title={`Edit ${l.title}`} side="sheet">
                <LinkForm link={l} onDone={() => setEditing(null)} />
              </DialogContent>
            </Dialog>
            <Confirm
              trigger={
                <button type="button" aria-label={`Delete ${l.title}`} className="grid size-9 place-items-center rounded-md text-muted hover:bg-sunken hover:text-danger">
                  <Trash2 aria-hidden className="size-4 stroke-[2]" />
                </button>
              }
              title={`Delete “${l.title}”?`}
              body="Agents will no longer see this link."
              confirmLabel="Delete"
              destructive
              onConfirm={async () => {
                const r = await deleteLink(l.id);
                if (!r.ok) notify.error("Not deleted", { description: r.error });
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
