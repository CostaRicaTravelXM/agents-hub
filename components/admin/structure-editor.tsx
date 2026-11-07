"use client";

import { useEffect, useId, useState, useTransition } from "react";
import Link from "next/link";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { createLesson, createModule, deleteModule, reorder, updateModule } from "@/app/actions/admin";
import { LESSON_ICON } from "@/components/learning/syllabus";
import { LESSON_TYPE_LABEL, type LessonType } from "@/lib/course";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, NativeSelect, Textarea } from "@/components/ui/form";
import { Confirm } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/surface";
import { notify } from "@/components/ui/toast";
import { cn, formatDuration } from "@/lib/utils";

export type EditorLesson = { id: string; title: string; type: LessonType; is_required: boolean; duration_seconds: number | null; ready: boolean };
export type EditorModule = { id: string; title: string; description: string | null; requires: string[]; lessons: EditorLesson[] };

function useDnd() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

function Handle(props: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted hover:bg-sunken active:cursor-grabbing"
      {...props}
    >
      <GripVertical aria-hidden className="size-4 stroke-[2]" />
    </button>
  );
}

function SortableItem({ id, children }: { id: string; children: (handle: React.HTMLAttributes<HTMLButtonElement>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "relative z-10 shadow-raised")}
    >
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

export function StructureEditor({ courseId, initial }: { courseId: string; initial: EditorModule[] }) {
  const [modules, setModules] = useState(initial);
  const [open, setOpen] = useState<string | null>(initial[0]?.id ?? null);
  const [newModule, setNewModule] = useState("");
  const [pending, start] = useTransition();
  const sensors = useDnd();
  const dndId = useId();

  // Keep local order in sync after server refreshes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setModules(initial), [initial]);

  const onModuleDrag = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = modules.findIndex((m) => m.id === e.active.id);
    const to = modules.findIndex((m) => m.id === e.over!.id);
    const next = arrayMove(modules, from, to);
    setModules(next);
    start(async () => {
      const r = await reorder("modules", next.map((m) => m.id));
      if (!r.ok) notify.error("Order not saved", { description: r.error });
    });
  };

  const onLessonDrag = (moduleId: string) => (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const mod = modules.find((m) => m.id === moduleId)!;
    const from = mod.lessons.findIndex((l) => l.id === e.active.id);
    const to = mod.lessons.findIndex((l) => l.id === e.over!.id);
    const lessons = arrayMove(mod.lessons, from, to);
    setModules((ms) => ms.map((m) => (m.id === moduleId ? { ...m, lessons } : m)));
    start(async () => {
      const r = await reorder("lessons", lessons.map((l) => l.id));
      if (!r.ok) notify.error("Order not saved", { description: r.error });
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-muted">
        Drag the handles to reorder. Agents unlock a module only after finishing every module it requires.
      </p>
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onModuleDrag}>
        <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          {modules.map((m, i) => (
            <SortableItem key={m.id} id={m.id}>
              {(handle) => (
                <ModuleCard
                  index={i}
                  module={m}
                  allModules={modules}
                  open={open === m.id}
                  onToggle={() => setOpen(open === m.id ? null : m.id)}
                  handle={handle}
                  sensors={sensors}
                  onLessonDrag={onLessonDrag(m.id)}
                />
              )}
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>

      <form
        className="flex flex-col gap-3 rounded-lg border-2 border-dashed border-line p-4 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await createModule(courseId, newModule);
            if (!r.ok) return void notify.error("Module not added", { description: r.error });
            setNewModule("");
            setOpen(r.data!.id);
            notify.success("Module added");
          });
        }}
      >
        <label htmlFor="new-module" className="sr-only">
          New module title
        </label>
        <Input id="new-module" placeholder="New module title, e.g. Hotels and lodges" value={newModule} onChange={(e) => setNewModule(e.target.value)} />
        <Button type="submit" variant="secondary" size="lg" loading={pending} disabled={newModule.trim().length < 2}>
          <Plus aria-hidden /> Add module
        </Button>
      </form>
    </div>
  );
}

function ModuleCard({
  index,
  module: m,
  allModules,
  open,
  onToggle,
  handle,
  sensors,
  onLessonDrag,
}: {
  index: number;
  module: EditorModule;
  allModules: EditorModule[];
  open: boolean;
  onToggle: () => void;
  handle: React.HTMLAttributes<HTMLButtonElement>;
  sensors: ReturnType<typeof useDnd>;
  onLessonDrag: (e: DragEndEvent) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(m.title);
  const [description, setDescription] = useState(m.description ?? "");
  const [requires, setRequires] = useState<string[]>(m.requires);
  const [lessonType, setLessonType] = useState<LessonType>("video");
  const [lessonTitle, setLessonTitle] = useState("");
  const [pending, start] = useTransition();
  const lessonDndId = useId();
  const others = allModules.filter((x) => x.id !== m.id);
  const reqNames = m.requires.map((id) => allModules.find((x) => x.id === id)?.title).filter(Boolean);

  return (
    <div className="overflow-hidden rounded-lg bg-card shadow-card">
      <div className="flex items-center gap-2 p-3 md:p-4">
        <Handle {...handle} />
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="grid size-9 shrink-0 place-items-center rounded-pill bg-ink font-display font-bold text-[16px] text-cloudy">{index + 1}</span>
          <span className="min-w-0">
            <span className="block truncate font-ui text-[16px] font-semibold text-ink">{m.title}</span>
            <span className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
              {m.lessons.length} lessons
              {reqNames.length ? (
                <span className="inline-flex items-center gap-1">
                  · <Lock aria-hidden className="size-3.5 stroke-[2]" /> after {reqNames.join(", ")}
                </span>
              ) : null}
            </span>
          </span>
          <ChevronDown aria-hidden className={cn("ml-auto size-5 shrink-0 stroke-[1.75] text-muted transition-transform duration-200", open && "rotate-180")} />
        </button>
      </div>

      {open ? (
        <div className="border-t border-line">
          {editing ? (
            <form
              className="space-y-4 bg-page p-4 md:p-5"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const r = await updateModule(m.id, { title, description, requiredModuleIds: requires });
                  if (!r.ok) return void notify.error("Module not saved", { description: r.error });
                  notify.success("Module saved");
                  setEditing(false);
                });
              }}
            >
              <Field label="Module title" htmlFor={`mt-${m.id}`}>
                <Input id={`mt-${m.id}`} value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field label="Description" htmlFor={`md-${m.id}`} optional>
                <Textarea id={`md-${m.id}`} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
              <fieldset>
                <legend className="font-ui text-[14px] font-semibold text-ink">Required before this module</legend>
                <p className="mb-3 text-[13px] text-muted">Agents must complete these modules to unlock this one.</p>
                {others.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {others.map((o) => (
                      <label key={o.id} className="flex items-center gap-3 rounded-md border border-line bg-card px-3 py-2.5 text-[14px]">
                        <Checkbox
                          checked={requires.includes(o.id)}
                          onCheckedChange={(c) => setRequires((r) => (c ? [...r, o.id] : r.filter((x) => x !== o.id)))}
                        />
                        <span className="text-ink">{o.title}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-muted">Add another module first.</p>
                )}
              </fieldset>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" loading={pending}>
                  Save module
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <span className="flex-1" />
                <Confirm
                  trigger={
                    <Button type="button" variant="danger" size="sm">
                      <Trash2 aria-hidden /> Delete module
                    </Button>
                  }
                  title={`Delete “${m.title}”?`}
                  body="Its lessons and every agent's progress on them are deleted too. This cannot be undone."
                  confirmLabel="Delete module"
                  destructive
                  onConfirm={async () => {
                    const r = await deleteModule(m.id);
                    if (!r.ok) notify.error("Not deleted", { description: r.error });
                  }}
                />
              </div>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-4 px-4 pt-3 md:px-5">
              <p className="text-[14px] text-muted">{m.description || "No description."}</p>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Pencil aria-hidden /> Edit module
              </Button>
            </div>
          )}

          <div className="p-2 md:p-3">
            <DndContext id={lessonDndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onLessonDrag}>
              <SortableContext items={m.lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                {m.lessons.map((l) => {
                  const Icon = LESSON_ICON[l.type];
                  return (
                    <SortableItem key={l.id} id={l.id}>
                      {(handle) => (
                        <div className="flex items-center gap-2 rounded-md bg-card px-1 py-1.5 hover:bg-page">
                          <Handle {...handle} />
                          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-sunken text-body">
                            <Icon aria-hidden className="size-[18px] stroke-[1.75]" />
                          </span>
                          <Link href={`/admin/lessons/${l.id}`} className="min-w-0 flex-1">
                            <span className="block truncate font-ui text-[15px] font-semibold text-ink hover:text-link">{l.title}</span>
                            <span className="block text-[13px] text-muted">
                              {LESSON_TYPE_LABEL[l.type]}
                              {l.duration_seconds ? ` · ${formatDuration(l.duration_seconds)}` : ""}
                            </span>
                          </Link>
                          {!l.ready ? <Badge tone="warning">Needs content</Badge> : null}
                          {!l.is_required ? <Badge tone="neutral">Optional</Badge> : null}
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/admin/lessons/${l.id}`}>Edit</Link>
                          </Button>
                        </div>
                      )}
                    </SortableItem>
                  );
                })}
              </SortableContext>
            </DndContext>

            <form
              className="mt-2 flex flex-col gap-2 rounded-md bg-page p-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const r = await createLesson(m.id, lessonType, lessonTitle);
                  if (r && !r.ok) notify.error("Lesson not added", { description: r.error });
                });
              }}
            >
              <label className="sr-only" htmlFor={`lt-${m.id}`}>
                Lesson type
              </label>
              <NativeSelect id={`lt-${m.id}`} value={lessonType} onChange={(e) => setLessonType(e.target.value as LessonType)} className="sm:w-44">
                {(Object.keys(LESSON_TYPE_LABEL) as LessonType[]).map((t) => (
                  <option key={t} value={t}>
                    {LESSON_TYPE_LABEL[t]}
                  </option>
                ))}
              </NativeSelect>
              <label className="sr-only" htmlFor={`ln-${m.id}`}>
                Lesson title
              </label>
              <Input id={`ln-${m.id}`} placeholder="Lesson title" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
              <Button type="submit" loading={pending} disabled={lessonTitle.trim().length < 2} className="h-12">
                <Plus aria-hidden /> Add lesson
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
