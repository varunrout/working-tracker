import { ENERGY_WINDOWS, DEFAULT_DURATION_MINUTES } from "./constants.js";
import { minutesBetween, formatISO, toDurationISO, parseTimeToken } from "./date.js";

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function windowToRange(date, window) {
  const base = new Date(date);
  const [startHours, startMinutes] = window.start.split(":").map(Number);
  const [endHours, endMinutes] = window.end.split(":").map(Number);
  const start = new Date(base);
  start.setHours(startHours, startMinutes, 0, 0);
  const end = new Date(base);
  end.setHours(endHours, endMinutes, 0, 0);
  return { start, end };
}

function intersects(a, b) {
  return a.start < b.end && b.start < a.end;
}

function subtractBusySlots(dayRange, busy) {
  let available = [dayRange];
  for (const block of busy) {
    available = available.flatMap((slot) => {
      if (!intersects(slot, block)) return [slot];
      const slots = [];
      if (slot.start < block.start) {
        slots.push({ start: slot.start, end: new Date(block.start) });
      }
      if (block.end < slot.end) {
        slots.push({ start: new Date(block.end), end: slot.end });
      }
      return slots.filter((s) => s.end - s.start > 5 * 60 * 1000);
    });
  }
  return available;
}

function findSlot({ date, scope, durationMinutes, busy, preference }) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 0, 0);
  let dayRange = { start: dayStart, end: dayEnd };

  const energy = ENERGY_WINDOWS[scope] ?? ENERGY_WINDOWS.work;
  let available = [];
  for (const window of energy) {
    const range = windowToRange(date, window);
    available.push(range);
  }

  const busyRanges = busy.map((slot) => ({
    start: new Date(slot.start),
    end: new Date(slot.end)
  }));

  available = available
    .flatMap((slot) => subtractBusySlots(slot, busyRanges))
    .sort((a, b) => a.start - b.start);

  if (preference) {
    const parsed = parseTimeToken(preference);
    if (parsed) {
      const prefStart = new Date(date);
      prefStart.setHours(parsed.hours, parsed.minutes, 0, 0);
      const prefEnd = new Date(prefStart.getTime() + durationMinutes * 60 * 1000);
      const preferredSlot = available.find(
        (slot) => prefStart >= slot.start && prefEnd <= slot.end
      );
      if (preferredSlot) {
        return { start: prefStart, end: prefEnd };
      }
    }
  }

  for (const slot of available) {
    const spanMinutes = minutesBetween(slot.start, slot.end);
    if (spanMinutes >= durationMinutes) {
      return { start: slot.start, end: new Date(slot.start.getTime() + durationMinutes * 60 * 1000) };
    }
  }
  return null;
}

export function scheduleItems({
  items,
  calendarBusy = [],
  date = new Date(),
  scope = "work"
}) {
  const scheduled = [];
  const conflicts = [];
  const busy = calendarBusy.map((slot) => ({
    start: new Date(slot.start),
    end: new Date(slot.end)
  }));

  for (const item of items) {
    const durationMinutes = item.duration_est
      ? parseInt(item.duration_est.replace(/PT|M|H/g, ""), 10) || DEFAULT_DURATION_MINUTES
      : DEFAULT_DURATION_MINUTES;
    const referenceDate = item.start_at ? new Date(item.start_at) : date;
    const scopeToUse = item.scope ?? scope;
    const slot = findSlot({
      date: referenceDate,
      scope: scopeToUse,
      durationMinutes,
      busy,
      preference: item.preferred_start
    });
    if (slot) {
      busy.push(slot);
      scheduled.push({
        ...item,
        start_at: formatISO(slot.start),
        end_at: formatISO(slot.end),
        duration_est: toDurationISO(durationMinutes),
        status: "active"
      });
    } else {
      conflicts.push({
        item,
        reason: "No available slot",
        alternatives: suggestAlternatives({ durationMinutes, scope: scopeToUse, busy, date: referenceDate })
      });
    }
  }
  return { scheduled, conflicts };
}

function suggestAlternatives({ durationMinutes, scope, busy, date }) {
  const suggestions = [];
  const energy = ENERGY_WINDOWS[scope] ?? ENERGY_WINDOWS.work;
  for (let offset = 0; offset < 7 && suggestions.length < 3; offset++) {
    const target = new Date(date.getTime() + offset * 24 * 60 * 60 * 1000);
    for (const window of energy) {
      const range = windowToRange(target, window);
      const slots = subtractBusySlots(range, busy);
      for (const slot of slots) {
        const spanMinutes = minutesBetween(slot.start, slot.end);
        if (spanMinutes >= durationMinutes) {
          suggestions.push({
            start_at: formatISO(slot.start),
            end_at: formatISO(new Date(slot.start.getTime() + durationMinutes * 60 * 1000))
          });
          if (suggestions.length >= 3) break;
        }
      }
      if (suggestions.length >= 3) break;
    }
  }
  return suggestions;
}
