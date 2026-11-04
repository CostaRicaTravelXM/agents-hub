"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/toast";

export function CopyLink({ path, label = "Share with clients" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      onClick={async () => {
        const url = `${window.location.origin}${path}`;
        try {
          if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
            await navigator.share({ url, title: "TravelXM Academy certificate" });
            return;
          }
          await navigator.clipboard.writeText(url);
          setCopied(true);
          notify.success("Link copied", { description: "Anyone with the link can verify this certificate." });
          setTimeout(() => setCopied(false), 2400);
        } catch {
          // Share sheet dismissed.
        }
      }}
    >
      {copied ? <Check aria-hidden /> : <Link2 aria-hidden />} {copied ? "Copied" : label}
    </Button>
  );
}
