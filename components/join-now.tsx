"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { joinGroup } from "@/app/actions/learning";
import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/toast";

export function JoinNow({ code }: { code: string }) {
  const [joined, setJoined] = useState(false);
  const [pending, start] = useTransition();
  if (joined)
    return (
      <div className="space-y-5">
        <p className="flex items-center gap-2 font-ui text-[16px] font-semibold text-success">
          <span className="grid size-6 place-items-center rounded-pill bg-olive text-white">
            <Check aria-hidden className="size-4 stroke-[3]" />
          </span>
          You are in
        </p>
        <Button asChild size="lg">
          <Link href="/courses">
            See your new courses <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    );
  return (
    <Button
      size="lg"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await joinGroup(code);
          if (!res.ok) return void notify.error("Could not join", { description: res.error });
          setJoined(true);
        })
      }
    >
      Join group
    </Button>
  );
}
