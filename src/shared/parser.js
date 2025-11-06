import { ITEM_TYPES, SCOPES, DEFAULT_DURATION_MINUTES } from "./constants.js";
import { parseDateTime, formatISO, toDurationISO } from "./date.js";

const PRIORITY_KEYWORDS = new Map([
  ["urgent", 5],
  ["critical", 5],
  ["high", 4],
  ["medium", 3],
  ["low", 2],
  ["someday", 1]
]);

const TYPE_HINTS = new Map([
  [/\bhabit\b|repeat|every/i, "habit"],
  [/\bgoal\b|kpi/i, "goal"],
  [/\blog\b|\bjournal\b/i, "log"],
  [/\bmeeting\b|call|join/i, "event"],
  [/\bremind\b/i, "reminder"],
  [/\bdecide\b|decision/i, "decision"],
  [/\bidea\b/i, "idea"],
  [/\bnote\b|remember/i, "note"],
  [/\bplan\b|prep|finish|complete|apply|ship|build|write|review|submit/i, "task"]
]);

const SCOPE_HINTS = new Map([
  [/\bwork\b|@work|@office|client|ship|deliver|meeting/i, "work"],
  [/\bpersonal\b|family|mum|mom|dad|gym|run|walk|call\s+mom|call\s+mum/i, "personal"]
]);

function detectPriority(text) {
  for (const [pattern, score] of PRIORITY_KEYWORDS) {
    if (pattern && typeof pattern === "string") {
      if (text.toLowerCase().includes(pattern)) return score;
    } else if (pattern.test(text)) {
      return score;
    }
  }
  const priorityMatch = text.match(/priority\s*(\d)/i);
  if (priorityMatch) return Number(priorityMatch[1]);
  return 3;
}

function detectType(text) {
  for (const [pattern, type] of TYPE_HINTS) {
    if (pattern.test(text)) return type;
  }
  return "task";
}

function detectScope(text) {
  for (const [pattern, scope] of SCOPE_HINTS) {
    if (pattern.test(text)) return scope;
  }
  return text.toLowerCase().includes("personal") ? "personal" : "work";
}

function detectContexts(text) {
  const contexts = [];
  const regex = /@([\w-]+)/g;
  let match;
  while ((match = regex.exec(text))) {
    contexts.push(`@${match[1]}`);
  }
  return contexts;
}

function detectTags(text) {
  const tags = [];
  const regex = /#([\w-]+)/g;
  let match;
  while ((match = regex.exec(text))) {
    tags.push(match[1]);
  }
  return tags;
}

function detectPeople(text) {
  const regex = /with\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  const people = [];
  let match;
  while ((match = regex.exec(text))) {
    people.push(match[1]);
  }
  return people;
}

function extractTitle(text) {
  const cleaned = text
    .replace(/remind me to/i, "")
    .replace(/remember to/i, "")
    .replace(/please/i, "")
    .replace(/by\s+\w+.*/, "")
    .replace(/\s+tag:.*/, "")
    .replace(/#\w+/g, "")
    .replace(/@\w+/g, "")
    .trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function computeAlternatives(base, text) {
  const variations = [];
  const altTypes = ["task", "event", "note"].filter((type) => type !== base.type);
  for (const type of altTypes) {
    variations.push({ ...base, type });
  }
  if (!base.start_at && base.due_at) {
    variations.push({ ...base, start_at: base.due_at });
  }
  return variations.slice(0, 3);
}

function normalizeItem(text, reference = new Date()) {
  const type = detectType(text);
  const scope = detectScope(text);
  const priority = detectPriority(text);
  const contexts = detectContexts(text);
  const tags = detectTags(text);
  const people = detectPeople(text);
  const { startAt, endAt, dueAt, durationMinutes, recurrence } = parseDateTime(text, reference);
  const duration = durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const base = {
    type,
    scope,
    title: extractTitle(text) || text,
    description: text,
    status: "inbox",
    priority,
    contexts,
    tags,
    people,
    start_at: formatISO(startAt),
    end_at: formatISO(endAt),
    due_at: formatISO(dueAt),
    duration_est: toDurationISO(duration),
    recurrence,
    ai_confidence: 0.74,
    ai_entities: { people, tokens: contexts.concat(tags) }
  };
  const alternatives = computeAlternatives(base, text);
  return { primary: base, alternatives };
}

export function parseInput(text, reference = new Date()) {
  const blocks = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const items = blocks.map((block) => normalizeItem(block, reference));
  return {
    interpretations: items,
    generated_at: new Date().toISOString()
  };
}
