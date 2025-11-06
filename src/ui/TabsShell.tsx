"use client";

import { useEffect, useState } from "react";

const tabs = [
  { key: "today", label: "Today" },
  { key: "timeline", label: "Timeline" },
  { key: "inbox", label: "Inbox" },
  { key: "goals", label: "Goals" },
  { key: "habits", label: "Habits" },
  { key: "search", label: "Search & Chat" },
];

type TabsShellProps = {
  refreshKey: number;
};

export function TabsShell({ refreshKey }: TabsShellProps) {
  const [active, setActive] = useState("today");

  useEffect(() => {
    // future: sync tab with url/search params
  }, [active]);

  return (
    <div>
      <nav className="sticky top-0 z-10 flex gap-1 overflow-x-auto rounded-2xl border bg-white/70 p-1 backdrop-blur">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-all rounded-xl ${
              active === tab.key ? "bg-slate-900 text-white shadow" : "hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <section className="mt-4">
        {active === "today" && <TodayView key={`today-${refreshKey}`} />}
        {active === "timeline" && <TimelineView key={`timeline-${refreshKey}`} />}
        {active === "inbox" && <InboxView key={`inbox-${refreshKey}`} refreshKey={refreshKey} />}
        {active === "goals" && <GoalsView />}
        {active === "habits" && <HabitsView />}
        {active === "search" && <SearchChatView />}
      </section>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border bg-white p-4 shadow-sm">{children}</div>;
}

function TodayView() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <h3 className="mb-2 font-semibold">Now / Next</h3>
        <p className="text-sm text-slate-600">Your immediate focus items will appear here.</p>
      </Card>
      <Card>
        <h3 className="mb-2 font-semibold">Agenda</h3>
        <p className="text-sm text-slate-600">Events and planned tasks for today.</p>
      </Card>
    </div>
  );
}

function TimelineView() {
  return (
    <Card>
      <h3 className="mb-2 font-semibold">Timeline</h3>
      <p className="text-sm text-slate-600">
        Day / Week / Month with drag-to-schedule (implement with a calendar library).
      </p>
    </Card>
  );
}

type InboxViewProps = {
  refreshKey: number;
};

function InboxView({ refreshKey }: InboxViewProps) {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/items")
      .then((response) => response.json())
      .then((data) => setItems(data.items ?? []));
  }, [refreshKey]);

  return (
    <Card>
      <h3 className="mb-2 font-semibold">Inbox</h3>
      <ul className="space-y-2">
        {items
          .filter((item) => item.status === "INBOX")
          .map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-slate-500">
                  {item.type} • {item.scope} • p{item.priority}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-lg bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200"
                  onClick={async () => {
                    await fetch(`/api/items/${item.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "ACTIVE" }),
                    });
                    setItems((prev) =>
                      prev.map((entry) =>
                        entry.id === item.id ? { ...entry, status: "ACTIVE" } : entry
                      )
                    );
                  }}
                >
                  Activate
                </button>
                <button
                  className="rounded-lg bg-slate-900 px-3 py-1 text-sm text-white hover:bg-black"
                  onClick={async () => {
                    await fetch(`/api/items/${item.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "DONE" }),
                    });
                    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
                  }}
                >
                  Done
                </button>
              </div>
            </li>
          ))}
      </ul>
    </Card>
  );
}

function GoalsView() {
  return <Card>Goals alignment and KPI snapshots go here.</Card>;
}

function HabitsView() {
  return <Card>Habit streaks and quick logging go here.</Card>;
}

function SearchChatView() {
  return <Card>Semantic search and chat over your items.</Card>;
}
