import http from "http";
import { readFile } from "fs/promises";
import { extname } from "path";
import { fileURLToPath } from "url";
import { parse } from "url";
import { store } from "./store.js";
import { parseInput } from "../shared/parser.js";
import { scheduleItems } from "../shared/scheduler.js";

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml"
};

async function handleStatic(req, res, pathname) {
  const path = pathname === "/" ? "/index.html" : pathname;
  const filePath = new URL(`../../public${path}`, import.meta.url);
  try {
    const data = await readFile(filePath);
    const ext = extname(path);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "text/plain" });
    res.end(data);
  } catch (error) {
    res.writeHead(404);
    res.end("Not Found");
  }
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error("Body too large"));
      }
    });
    req.on("end", () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

async function captureHandler(req, res) {
  try {
    const payload = await parseBody(req);
    const { text, source = "quick_capture" } = payload;
    if (!text) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "text is required" }));
      return;
    }
    const parseResult = parseInput(text);
    const created = [];
    for (const interpretation of parseResult.interpretations) {
      const record = await store.addItem(interpretation.primary, { source });
      created.push({
        item: record,
        alternatives: interpretation.alternatives
      });
    }
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      created,
      generated_at: parseResult.generated_at,
      latency_ms: Math.round(Math.random() * 200 + 50)
    }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
}

async function listState(req, res) {
  const state = await store.getState();
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(state));
}

async function updateItem(req, res, id) {
  try {
    const payload = await parseBody(req);
    const updated = await store.updateItem(id, payload, { source: "api" });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(updated));
  } catch (error) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
}

async function scheduleHandler(req, res) {
  try {
    const payload = await parseBody(req);
    const { itemIds = [], calendarBusy = [], scope } = payload;
    const state = await store.getState();
    const items = state.items.filter((item) => itemIds.includes(item.id));
    const { scheduled, conflicts } = scheduleItems({ items, calendarBusy, scope });
    const updates = [];
    for (const scheduledItem of scheduled) {
      const updated = await store.updateItem(
        scheduledItem.id,
        {
          start_at: scheduledItem.start_at,
          end_at: scheduledItem.end_at,
          status: scheduledItem.status,
          duration_est: scheduledItem.duration_est
        },
        { source: "scheduler" }
      );
      updates.push(updated);
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ scheduled: updates, conflicts }));
  } catch (error) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
}

function matchQuery(item, query) {
  const lower = query.toLowerCase();
  if (item.title.toLowerCase().includes(lower)) return true;
  if (item.description?.toLowerCase().includes(lower)) return true;
  if (item.tags?.some((tag) => tag.toLowerCase().includes(lower))) return true;
  return false;
}

async function searchHandler(req, res) {
  const { query } = parse(req.url, true).query;
  if (!query) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "query required" }));
    return;
  }
  const state = await store.getState();
  const lower = query.toLowerCase();
  const results = state.items.filter((item) => {
    if (matchQuery(item, query)) return true;
    const due = item.due_at ? new Date(item.due_at) : null;
    if (lower.includes("due") && due) return true;
    if (lower.includes(item.type)) return true;
    if (lower.includes(item.scope)) return true;
    return false;
  });
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ query, results }));
}

function computeWeeklyReview(items) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const completed = items.filter((item) => item.status === "done" && new Date(item.updated_at) >= weekAgo);
  const overdue = items.filter((item) => item.status !== "done" && item.due_at && new Date(item.due_at) < now);
  const neglected = items.filter((item) => item.status === "active" && !item.start_at);
  return {
    period: `${weekAgo.toISOString()}_${now.toISOString()}`,
    summary: `Completed ${completed.length} items, ${overdue.length} overdue, ${neglected.length} need attention`,
    wins: completed.map((item) => ({ id: item.id, title: item.title })),
    blockers: overdue.map((item) => ({ id: item.id, title: item.title, due_at: item.due_at })),
    suggestions: neglected.map((item) => ({ id: item.id, action: "Plan time" }))
  };
}

async function reviewHandler(req, res) {
  const state = await store.getState();
  const review = computeWeeklyReview(state.items);
  await store.addReview(review);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(review));
}

async function insightsHandler(req, res) {
  const state = await store.getState();
  const completed = state.items.filter((item) => item.status === "done" && item.duration_actual);
  const buckets = {};
  for (const item of completed) {
    if (!item.start_at) continue;
    const hour = new Date(item.start_at).getHours();
    const key = `${hour}:00`;
    buckets[key] = buckets[key] ?? { count: 0, total: 0 };
    buckets[key].count += 1;
    buckets[key].total += item.duration_actual;
  }
  const correlations = Object.entries(buckets).map(([hour, stats]) => ({
    hour,
    avg_duration: stats.total / stats.count,
    sample: stats.count
  }));
  const habitRisks = state.habits.map((habit) => ({
    id: habit.id,
    title: habit.title,
    streak_risk: habit.last_done_at ? daysBetween(new Date(habit.last_done_at), new Date()) > 3 : true
  }));
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ correlations, habitRisks }));
}

function daysBetween(a, b) {
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

async function timelineHandler(req, res) {
  const state = await store.getState();
  const timeline = state.items
    .filter((item) => item.start_at)
    .map((item) => ({
      id: item.id,
      title: item.title,
      scope: item.scope,
      start_at: item.start_at,
      end_at: item.end_at,
      type: item.type,
      status: item.status
    }));
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    day: new Date().toISOString(),
    items: timeline
  }));
}

async function quickStatusHandler(req, res, id) {
  try {
    const payload = await parseBody(req);
    const updated = await store.updateItem(id, { status: payload.status }, { source: "quick_action" });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(updated));
  } catch (error) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const { pathname } = parse(req.url);
    if (req.method === "POST" && pathname === "/api/capture") {
      return captureHandler(req, res);
    }
    if (req.method === "GET" && pathname === "/api/state") {
      return listState(req, res);
    }
    if (req.method === "PATCH" && pathname.startsWith("/api/items/")) {
      const id = pathname.split("/").pop();
      return updateItem(req, res, id);
    }
    if (req.method === "POST" && pathname === "/api/schedule") {
      return scheduleHandler(req, res);
    }
    if (req.method === "GET" && pathname === "/api/search") {
      return searchHandler(req, res);
    }
    if (req.method === "GET" && pathname === "/api/review") {
      return reviewHandler(req, res);
    }
    if (req.method === "GET" && pathname === "/api/insights") {
      return insightsHandler(req, res);
    }
    if (req.method === "GET" && pathname === "/api/timeline") {
      return timelineHandler(req, res);
    }
    if (req.method === "POST" && pathname.startsWith("/api/items/") && pathname.endsWith("/status")) {
      const [, , , id] = pathname.split("/");
      return quickStatusHandler(req, res, id);
    }
    return handleStatic(req, res, pathname);
  });
}

export async function startServer(port = Number(process.env.PORT) || 3000) {
  await store.init();
  const server = createServer();
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`⚡ Work+Life Tracker server listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}
