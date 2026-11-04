"use client";

import { useRef, useState } from "react";
import { CloudUpload, FileCheck2, RotateCcw, X } from "lucide-react";
import type { UploadKind } from "@/lib/media";
import { UPLOAD_RULES } from "@/lib/media";
import { cn, formatBytes } from "@/lib/utils";

export type Uploaded = { key: string; name: string; size: number; type: string; durationSeconds?: number };

function videoDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      resolve(Number.isFinite(v.duration) ? Math.round(v.duration) : undefined);
    };
    v.onerror = () => resolve(undefined);
    v.src = URL.createObjectURL(file);
  });
}

/** Direct-to-R2 upload with progress. The server only signs the request. */
export function Uploader({
  kind,
  scope,
  label,
  hint,
  current,
  onUploaded,
  onClear,
  className,
}: {
  kind: UploadKind;
  scope?: string;
  label: string;
  hint?: string;
  current?: { name: string; size?: number | null } | null;
  onUploaded: (u: Uploaded) => void;
  onClear?: () => void;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const start = async (file: File) => {
    setError(null);
    const rule = UPLOAD_RULES[kind];
    const type = file.type || "application/octet-stream";
    if (!(rule.types as readonly string[]).includes(type)) return setError("That file type is not supported here.");
    if (file.size > rule.maxBytes) return setError(`The file is larger than ${formatBytes(rule.maxBytes)}.`);
    setProgress(0);
    try {
      const [sign, durationSeconds] = await Promise.all([
        fetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, filename: file.name, contentType: type, size: file.size, scope }),
        }).then(async (r) => {
          const j = await r.json();
          if (!r.ok) throw new Error(j.error ?? "Upload could not start");
          return j as { url: string; key: string };
        }),
        kind === "video" ? videoDuration(file) : Promise.resolve(undefined),
      ]);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", sign.url);
        xhr.setRequestHeader("Content-Type", type);
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage responded ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });
      onUploaded({ key: sign.key, name: file.name, size: file.size, type, durationSeconds });
      setProgress(null);
    } catch (e) {
      setProgress(null);
      setError((e as Error).message);
    }
  };

  return (
    <div className={className}>
      <p className="mb-2 font-ui text-[14px] font-semibold text-ink">{label}</p>
      {current && progress === null ? (
        <div className="flex items-center gap-3 rounded-md border border-line bg-card p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-olive text-white">
            <FileCheck2 aria-hidden className="size-5 stroke-[1.75]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">{current.name}</p>
            {current.size ? <p className="text-[13px] text-muted">{formatBytes(current.size)}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 font-ui text-[13px] font-semibold text-ink hover:bg-sunken"
          >
            <RotateCcw aria-hidden className="size-4 stroke-[2]" /> Replace
          </button>
          {onClear ? (
            <button type="button" aria-label="Remove file" onClick={onClear} className="grid size-9 place-items-center rounded-md text-muted hover:bg-sunken">
              <X aria-hidden className="size-4 stroke-[2]" />
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void start(f);
          }}
          disabled={progress !== null}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors duration-120 ease-standard",
            drag ? "border-secondary bg-turquoise/10" : "border-[#d6cdb8] bg-card hover:border-line-strong",
          )}
        >
          {progress === null ? (
            <>
              <CloudUpload aria-hidden className="size-6 stroke-[1.75] text-muted" />
              <span className="font-ui text-[14px] font-semibold text-ink">Drop a file or click to browse</span>
              {hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
            </>
          ) : (
            <div className="w-full max-w-xs">
              <p className="font-ui text-[14px] font-semibold text-ink">Uploading… {progress}%</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-black/10">
                <div className="h-full rounded-pill bg-primary transition-[width] duration-200" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </button>
      )}
      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
      <input
        ref={input}
        type="file"
        hidden
        accept={UPLOAD_RULES[kind].types.join(",")}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void start(f);
        }}
      />
    </div>
  );
}
