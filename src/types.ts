export type Scope = "WORK" | "PERSONAL" | "BOTH";
export type ItemType =
  | "TASK"
  | "EVENT"
  | "NOTE"
  | "HABIT"
  | "GOAL"
  | "IDEA"
  | "DECISION"
  | "LOG"
  | "REMINDER";
export type Status = "INBOX" | "ACTIVE" | "WAITING" | "BLOCKED" | "DONE" | "DROPPED";

export interface ItemDTO {
  id?: string;
  type: ItemType;
  scope: Scope;
  title: string;
  description?: string;
  status?: Status;
  priority?: number;
  tags?: string[];
  contexts?: string[];
  startAt?: string;
  endAt?: string;
  dueAt?: string;
  durationEstMins?: number;
  durationActualMins?: number;
  recurrence?: string;
  location?: string;
  aiEntities?: Record<string, unknown>;
  aiConfidence?: number;
  dependencies?: string[];
  source?: "text" | "voice" | "email" | "api";
}
