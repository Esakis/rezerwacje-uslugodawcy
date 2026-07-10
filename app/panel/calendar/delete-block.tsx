"use client";

import { useTransition } from "react";
import { deleteBlock } from "./actions";

export function DeleteBlockButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => deleteBlock(id))}
      disabled={pending}
      className="text-xs text-slate-400 hover:text-red-600"
      title="Usuń blokadę"
    >
      ✕
    </button>
  );
}
