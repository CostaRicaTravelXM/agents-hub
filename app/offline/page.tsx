import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { LogoBadge } from "@/components/brand";

export const metadata: Metadata = { title: "Offline" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="xm-container flex min-h-dvh flex-col items-start justify-center py-16">
      <LogoBadge size={64} />
      <span className="mt-10 grid size-12 place-items-center rounded-pill bg-sunken text-ink">
        <WifiOff aria-hidden className="size-5 stroke-[1.75]" />
      </span>
      <h1 className="xm-title mt-5">You are offline</h1>
      <p className="xm-lead mt-4 max-w-lg text-muted">
        Reconnect to keep learning. Everything you finished before losing the connection is saved.
      </p>
    </main>
  );
}
