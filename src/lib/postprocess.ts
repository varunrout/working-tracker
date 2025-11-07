import { ItemDTO } from "@/src/types";

export function normalizeItem(raw: Partial<ItemDTO>): ItemDTO {
  const base: ItemDTO = {
    type: raw.type || "TASK",
    scope: raw.scope || "PERSONAL",
    title: raw.title || "Untitled",
    status: raw.status || "INBOX",
    priority: Math.min(5, Math.max(0, raw.priority ?? 2)),
    tags: raw.tags ?? [],
    contexts: raw.contexts ?? [],
    startAt: raw.startAt,
    endAt: raw.endAt,
    dueAt: raw.dueAt,
    durationEstMins: raw.durationEstMins,
    durationActualMins: raw.durationActualMins,
    recurrence: raw.recurrence,
    location: raw.location,
    aiEntities: raw.aiEntities,
    aiConfidence: raw.aiConfidence ?? 0.8,
    dependencies: raw.dependencies ?? [],
    source: raw.source || "text",
  };

  if (base.startAt && !base.endAt && !base.durationEstMins) {
    base.durationEstMins = 30;
  }

  return base;
}
