import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { randomUUID } from "crypto";

const DB_PATH = new URL("../../data/store.json", import.meta.url);

const defaultState = {
  items: [],
  goals: [],
  habits: [],
  reviews: [],
  integrations: [],
  audit: []
};

async function loadState() {
  if (!existsSync(DB_PATH)) {
    await writeFile(DB_PATH, JSON.stringify(defaultState, null, 2));
    return { ...defaultState };
  }
  const data = await readFile(DB_PATH, "utf-8");
  try {
    const parsed = JSON.parse(data);
    return { ...defaultState, ...parsed };
  } catch (error) {
    return { ...defaultState };
  }
}

async function saveState(state) {
  await writeFile(DB_PATH, JSON.stringify(state, null, 2));
}

export class Store {
  constructor() {
    this.state = null;
  }

  async init() {
    this.state = await loadState();
    return this.state;
  }

  async ensure() {
    if (!this.state) {
      await this.init();
    }
    return this.state;
  }

  async getState() {
    await this.ensure();
    return this.state;
  }

  async addItem(item, metadata = {}) {
    await this.ensure();
    const now = new Date().toISOString();
    const record = {
      id: randomUUID(),
      created_at: now,
      updated_at: now,
      ...item
    };
    this.state.items.push(record);
    this.state.audit.push({
      id: randomUUID(),
      type: "create",
      entity: "item",
      entity_id: record.id,
      payload: item,
      performed_at: now,
      metadata
    });
    await saveState(this.state);
    return record;
  }

  async updateItem(id, updates, metadata = {}) {
    await this.ensure();
    const index = this.state.items.findIndex((item) => item.id === id);
    if (index === -1) throw new Error("Item not found");
    const now = new Date().toISOString();
    this.state.items[index] = {
      ...this.state.items[index],
      ...updates,
      updated_at: now
    };
    this.state.audit.push({
      id: randomUUID(),
      type: "update",
      entity: "item",
      entity_id: id,
      payload: updates,
      performed_at: now,
      metadata
    });
    await saveState(this.state);
    return this.state.items[index];
  }

  async listItems(filter = {}) {
    await this.ensure();
    return this.state.items.filter((item) => {
      return Object.entries(filter).every(([key, value]) => {
        if (value === undefined) return true;
        if (Array.isArray(value)) {
          return value.includes(item[key]);
        }
        return item[key] === value;
      });
    });
  }

  async upsertGoal(goal) {
    await this.ensure();
    const now = new Date().toISOString();
    const existing = this.state.goals.find((g) => g.id === goal.id);
    if (existing) {
      Object.assign(existing, goal, { updated_at: now });
    } else {
      this.state.goals.push({ ...goal, id: randomUUID(), created_at: now, updated_at: now });
    }
    await saveState(this.state);
  }

  async addReview(review) {
    await this.ensure();
    const now = new Date().toISOString();
    const record = { id: randomUUID(), created_at: now, ...review };
    this.state.reviews.push(record);
    await saveState(this.state);
    return record;
  }
}

export const store = new Store();
