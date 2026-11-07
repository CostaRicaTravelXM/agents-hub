"use client";

import { useEffect, useRef } from "react";

const key = (id: string) => `xm:book:${id}:page`;

export function readSavedPage(bookId: string): number | null {
  try {
    const n = Number(localStorage.getItem(key(bookId)));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function saveOnServer(bookId: string, page: number) {
  void fetch(`/api/hub/books/${bookId}/progress`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page }),
    keepalive: true,
  }).catch(() => {});
}

/**
 * Remembers the page on this device at once, and on the server a moment later.
 * `enabled` stays false until the saved page has been read, or the first render
 * would overwrite it. Opening a book without turning a page saves nothing on the server.
 */
export function usePageMemory(bookId: string, page: number, enabled: boolean) {
  const opened = useRef<number | null>(null);
  const pending = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    try {
      localStorage.setItem(key(bookId), String(page));
    } catch {
      // Private mode: the server copy still works.
    }
    if (opened.current === null) {
      opened.current = page;
      return;
    }
    pending.current = page;
    const timer = setTimeout(() => {
      pending.current = null;
      saveOnServer(bookId, page);
    }, 1500);
    return () => clearTimeout(timer);
  }, [bookId, page, enabled]);

  // Leaving the reader or closing the tab sends whatever is still waiting.
  useEffect(() => {
    const flush = () => {
      if (pending.current === null) return;
      saveOnServer(bookId, pending.current);
      pending.current = null;
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [bookId]);
}
