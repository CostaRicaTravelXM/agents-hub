"use client";

import { useState, useTransition } from "react";
import { MapPin, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { deleteCategory, saveCategory } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch } from "@/components/ui/form";
import { Confirm, Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/surface";
import { notify } from "@/components/ui/toast";

type Category = { id: string; name: string; description: string | null; is_destination: boolean; courses: number };

function CategoryForm({ category, onDone }: { category?: Category; onDone: () => void }) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [isDestination, setIsDestination] = useState(category?.is_destination ?? true);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveCategory(category?.id ?? null, { name, description, is_destination: isDestination });
          if (!r.ok) return void notify.error("Not saved", { description: r.error });
          notify.success(category ? "Category saved" : "Category added");
          onDone();
        });
      }}
    >
      <Field label="Name" htmlFor="c-name">
        <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Description" htmlFor="c-desc" optional>
        <Input id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <label className="flex items-center justify-between gap-3 rounded-md border border-line p-4">
        <span>
          <span className="block font-ui text-[14px] font-semibold text-ink">Destination</span>
          <span className="block text-[13px] text-muted">Destinations are counted in the “most viewed destinations” metric.</span>
        </span>
        <Switch checked={isDestination} onCheckedChange={setIsDestination} aria-label="Destination" />
      </label>
      <Button type="submit" loading={pending} disabled={name.trim().length < 2}>
        Save category
      </Button>
    </form>
  );
}

export function CategoriesEditor({ categories }: { categories: Category[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div>
      <div className="mb-5">
        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogTrigger asChild>
            <Button>
              <Plus aria-hidden /> New category
            </Button>
          </DialogTrigger>
          <DialogContent title="New category" description="Destinations and topics group courses in the catalog." side="sheet">
            <CategoryForm onDone={() => setAdding(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-start gap-4 rounded-lg bg-card p-5 shadow-card">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-sunken text-body">
              {c.is_destination ? <MapPin aria-hidden className="size-5 stroke-[1.75]" /> : <Tag aria-hidden className="size-5 stroke-[1.75]" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-ui text-[16px] font-semibold text-ink">{c.name}</p>
              {c.description ? <p className="mt-0.5 text-[14px] text-muted">{c.description}</p> : null}
              <div className="mt-2 flex gap-2">
                <Badge tone={c.is_destination ? "info" : "neutral"}>{c.is_destination ? "Destination" : "Topic"}</Badge>
                <Badge tone="neutral">{c.courses} courses</Badge>
              </div>
            </div>
            <Dialog open={editing === c.id} onOpenChange={(o) => setEditing(o ? c.id : null)}>
              <DialogTrigger aria-label={`Edit ${c.name}`} className="grid size-9 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink">
                <Pencil aria-hidden className="size-4 stroke-[2]" />
              </DialogTrigger>
              <DialogContent title={`Edit ${c.name}`} side="sheet">
                <CategoryForm category={c} onDone={() => setEditing(null)} />
              </DialogContent>
            </Dialog>
            <Confirm
              trigger={
                <button type="button" aria-label={`Delete ${c.name}`} className="grid size-9 place-items-center rounded-md text-muted hover:bg-sunken hover:text-danger">
                  <Trash2 aria-hidden className="size-4 stroke-[2]" />
                </button>
              }
              title={`Delete “${c.name}”?`}
              body={c.courses ? `${c.courses} courses will have no category.` : "No courses use it."}
              confirmLabel="Delete"
              destructive
              onConfirm={async () => {
                const r = await deleteCategory(c.id);
                if (!r.ok) notify.error("Not deleted", { description: r.error });
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
