"use client";

import { ModuleError } from "@/components/hub/states";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <ModuleError title="Marketing assets could not be loaded" reset={reset} />;
}
