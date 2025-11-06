"use client";

import { useState } from "react";
import { QuickAdd } from "@/src/ui/QuickAdd";
import { TabsShell } from "@/src/ui/TabsShell";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">FocusFlow</h1>
        <QuickAdd onCreated={() => setRefreshKey((key) => key + 1)} />
      </header>
      <TabsShell refreshKey={refreshKey} />
    </div>
  );
}
