"use client";

import { useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, Undo2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function RichTextEditor({ value, onChange, label }: { value: unknown; onChange: (json: unknown) => void; label: string }) {
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
        code: false,
        codeBlock: false,
      }),
    ],
    content: (value as object) ?? "",
    editorProps: {
      attributes: {
        class: "xm-prose min-h-[320px] px-5 py-4 outline-none md:px-8 md:py-6",
        "aria-label": label,
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
          }
        : null,
  });

  const btn = (icon: LucideIcon, label: string, active: boolean | undefined, run: () => void) => {
    const Icon = icon;
    return (
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={run}
        className={cn(
          "grid size-9 place-items-center rounded-md transition-colors duration-120",
          active ? "bg-ink text-cloudy" : "text-body hover:bg-sunken",
        )}
      >
        <Icon aria-hidden className="size-[18px] stroke-[1.75]" />
      </button>
    );
  };

  return (
    <div className="overflow-hidden rounded-md border border-control bg-card focus-within:border-ink">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-page p-1.5" role="toolbar" aria-label="Formatting">
        {btn(Heading2, "Heading", state?.h2, () => editor?.chain().focus().toggleHeading({ level: 2 }).run())}
        {btn(Heading3, "Subheading", state?.h3, () => editor?.chain().focus().toggleHeading({ level: 3 }).run())}
        <span className="mx-1 h-6 w-px bg-line" />
        {btn(Bold, "Bold", state?.bold, () => editor?.chain().focus().toggleBold().run())}
        {btn(Italic, "Italic", state?.italic, () => editor?.chain().focus().toggleItalic().run())}
        {btn(Link2, "Link", state?.link || linkUrl !== null, () => {
          if (!editor) return;
          if (editor.isActive("link")) return void editor.chain().focus().unsetLink().run();
          setLinkUrl((u) => (u === null ? "https://" : null));
        })}
        <span className="mx-1 h-6 w-px bg-line" />
        {btn(List, "Bulleted list", state?.bullet, () => editor?.chain().focus().toggleBulletList().run())}
        {btn(ListOrdered, "Numbered list", state?.ordered, () => editor?.chain().focus().toggleOrderedList().run())}
        {btn(Quote, "Callout quote", state?.quote, () => editor?.chain().focus().toggleBlockquote().run())}
        {btn(Minus, "Divider", false, () => editor?.chain().focus().setHorizontalRule().run())}
        <span className="flex-1" />
        {btn(Undo2, "Undo", false, () => editor?.chain().focus().undo().run())}
        {btn(Redo2, "Redo", false, () => editor?.chain().focus().redo().run())}
      </div>
      {linkUrl !== null ? (
        <div className="flex items-center gap-2 border-b border-line bg-page px-2 py-2">
          <label htmlFor="rte-link" className="sr-only">
            Link address
          </label>
          <input
            id="rte-link"
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (/^https?:\/\/.+/.test(linkUrl)) editor?.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
                setLinkUrl(null);
              }
              if (e.key === "Escape") setLinkUrl(null);
            }}
            placeholder="https://"
            className="h-9 flex-1 rounded-md border border-control bg-card px-3 text-[14px] outline-none focus-visible:border-ink"
          />
          <button
            type="button"
            onClick={() => {
              if (/^https?:\/\/.+/.test(linkUrl)) editor?.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
              setLinkUrl(null);
            }}
            className="h-9 rounded-md bg-primary px-3 font-ui text-[13px] font-semibold text-white hover:bg-primary-hover"
          >
            Apply link
          </button>
        </div>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
