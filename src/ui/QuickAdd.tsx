"use client";

import { useState } from "react";

type QuickAddProps = {
  onCreated?: () => void;
};

export function QuickAdd({ onCreated }: QuickAddProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        throw new Error("Failed to ingest entry");
      }

      setText("");
      onCreated?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Type anything… e.g., Apply for Data Engineer Fri 17:00"
        className="flex-1 rounded-xl border px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
      />
      <button
        onClick={submit}
        disabled={loading}
        className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow hover:bg-black disabled:opacity-50"
      >
        {loading ? "Thinking…" : "Add"}
      </button>
    </div>
  );
}
