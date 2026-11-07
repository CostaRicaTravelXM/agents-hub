"use client";

import { useEffect, useId, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { reorder } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, StatusDot } from "@/components/ui/surface";
import { notify } from "@/components/ui/toast";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export type HubRow = {
  id: string;
  href: string;
  title: string;
  subtitle?: string | null;
  status: "draft" | "published" | "archived";
  imageKey?: string | null;
  note?: string | null;
  portrait?: boolean;
};

const tone = { published: "success", draft: "warning", archived: "muted" } as const;

function Row({ row, handle }: { row: HubRow; handle: React.HTMLAttributes<HTMLButtonElement> }) {
  const cover = mediaUrl(row.imageKey);
  return (
    <div className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-card">
      <button type="button" aria-label="Drag to reorder" className="grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted hover:bg-sunken active:cursor-grabbing" {...handle}>
        <GripVertical aria-hidden className="size-4 stroke-[2]" />
      </button>
      <Link href={row.href} className="group flex min-w-0 flex-1 items-center gap-3">
        <span className={cn("relative block shrink-0 overflow-hidden rounded-md bg-sunken", row.portrait ? "h-16 w-12" : "h-12 w-[76px]")}>
          {cover ? <Image src={cover} alt="" fill sizes="80px" className="object-cover" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-ui text-[16px] font-semibold text-ink group-hover:text-link">{row.title}</span>
          {row.subtitle ? <span className="block truncate text-[14px] text-muted">{row.subtitle}</span> : null}
        </span>
      </Link>
      {row.note ? <Badge tone="warning">{row.note}</Badge> : null}
      <span className="inline-flex shrink-0 items-center gap-2 font-ui text-[13px] font-semibold text-body capitalize">
        <StatusDot tone={tone[row.status]} /> {row.status}
      </span>
    </div>
  );
}

function SortableRow({ row }: { row: HubRow }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn(isDragging && "relative z-10")}>
      <Row row={row} handle={{ ...attributes, ...listeners }} />
    </li>
  );
}

/** Admin list for a hub module: drag to reorder, click to edit, one button to add. */
export function HubAdminList({
  table,
  rows,
  newHref,
  newLabel,
  emptyTitle,
  emptyBody,
}: {
  table: "hub_fam_trips" | "hub_offers" | "hub_books";
  rows: HubRow[];
  newHref: string;
  newLabel: string;
  emptyTitle: string;
  emptyBody: string;
}) {
  const [items, setItems] = useState(rows);
  const [, start] = useTransition();
  const dndId = useId();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setItems(rows), [rows]);

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((r) => r.id === e.active.id);
    const to = items.findIndex((r) => r.id === e.over!.id);
    const next = arrayMove(items, from, to);
    setItems(next);
    start(async () => {
      const r = await reorder(table, next.map((x) => x.id));
      if (!r.ok) notify.error("Order not saved", { description: r.error });
    });
  };

  if (!items.length) {
    return (
      <EmptyState
        title={emptyTitle}
        body={emptyBody}
        action={
          <Button asChild>
            <Link href={newHref}>
              <Plus aria-hidden /> {newLabel}
            </Link>
          </Button>
        }
      />
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-[14px] text-muted">Drag the handles to change the order agents see.</p>
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((r) => (
              <SortableRow key={r.id} row={r} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
