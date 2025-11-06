export const ITEM_TYPES = [
  "task",
  "event",
  "note",
  "habit",
  "goal",
  "idea",
  "decision",
  "log",
  "reminder"
];

export const STATUSES = [
  "inbox",
  "active",
  "waiting",
  "blocked",
  "done",
  "dropped"
];

export const SCOPES = ["work", "personal", "blended"];

export const DEFAULT_DURATION_MINUTES = 30;

export const ENERGY_WINDOWS = {
  work: [
    { start: "09:00", end: "12:00" },
    { start: "13:00", end: "17:30" }
  ],
  personal: [
    { start: "06:30", end: "08:30" },
    { start: "18:00", end: "22:00" }
  ]
};

export const WEEKDAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
