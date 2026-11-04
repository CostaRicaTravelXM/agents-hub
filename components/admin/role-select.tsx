"use client";

import { useTransition } from "react";
import { setUserRole } from "@/app/actions/admin";
import { NativeSelect } from "@/components/ui/form";
import { notify } from "@/components/ui/toast";

export function RoleSelect({ userId, role }: { userId: string; role: string }) {
  const [pending, start] = useTransition();
  return (
    <div>
      <label htmlFor="role" className="mb-2 block font-ui text-[14px] font-semibold text-ink">
        Role
      </label>
      <NativeSelect
        id="role"
        defaultValue={role}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          start(async () => {
            const r = await setUserRole(userId, next);
            if (!r.ok) {
              e.target.value = role;
              return void notify.error("Role not changed", { description: r.error });
            }
            notify.success("Role updated");
          });
        }}
      >
        <option value="agent">Travel agent</option>
        <option value="content_manager">Content manager (courses and analytics)</option>
        <option value="admin">Admin (everything, including people and groups)</option>
      </NativeSelect>
    </div>
  );
}
