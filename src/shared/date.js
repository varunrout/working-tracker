import { WEEKDAYS } from "./constants.js";

const MS_IN_MINUTE = 60 * 1000;
const MS_IN_HOUR = 60 * MS_IN_MINUTE;
const MS_IN_DAY = 24 * MS_IN_HOUR;

export function toISODate(date) {
  return new Date(date).toISOString();
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseTimeToken(token) {
  const match = token.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const suffix = match[3]?.toLowerCase();
  if (suffix) {
    if (suffix === "pm" && hours < 12) hours += 12;
    if (suffix === "am" && hours === 12) hours = 0;
  }
  return { hours, minutes };
}

export function parseDuration(text) {
  const durationRegex = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h)\b|(\d+(?:\.\d+)?)\s*(minutes?|mins?|m)\b/gi;
  let match;
  let minutes = 0;
  while ((match = durationRegex.exec(text))) {
    if (match[1]) {
      minutes += Number(match[1]) * 60;
    } else if (match[3]) {
      minutes += Number(match[3]);
    }
  }
  return minutes || null;
}

export function resolveWeekday(reference, weekday) {
  const ref = startOfDay(reference);
  const targetIndex = WEEKDAYS.indexOf(weekday.toLowerCase());
  if (targetIndex === -1) return null;
  const dayDiff = (targetIndex + 7 - ref.getDay()) % 7 || 7;
  return new Date(ref.getTime() + dayDiff * MS_IN_DAY);
}

export function parseDateTime(text, reference = new Date()) {
  const lower = text.toLowerCase();
  const result = {
    startAt: null,
    endAt: null,
    dueAt: null,
    durationMinutes: null,
    recurrence: null,
    tokens: []
  };

  const duration = parseDuration(text);
  if (duration) {
    result.durationMinutes = duration;
  }

  const recurrenceMatch = lower.match(/(?:every|repeat)\s+([a-z,\s]+)/);
  if (recurrenceMatch) {
    const days = recurrenceMatch[1]
      .split(/[\s,]+/)
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean)
      .map((token) => WEEKDAYS.find((day) => day.startsWith(token)) || null)
      .filter(Boolean);
    if (days.length) {
      result.recurrence = {
        freq: "weekly",
        byweekday: days
      };
    }
  }

  const tokens = text.split(/\s+/);
  const times = tokens
    .map((token) => ({ token, time: parseTimeToken(token.replace(/[;,.]/g, "")) }))
    .filter((item) => item.time);

  if (times.length) {
    result.tokens.push(...times.map((t) => t.token));
  }

  const hasTomorrow = /tomorrow/.test(lower);
  const hasToday = /today/.test(lower);
  const hasTonight = /tonight/.test(lower);
  const hasMorning = /morning/.test(lower);
  const hasAfternoon = /afternoon/.test(lower);
  const hasEvening = /evening|night/.test(lower);

  let baseDate = startOfDay(reference);
  if (hasTomorrow) {
    baseDate = new Date(baseDate.getTime() + MS_IN_DAY);
  } else if (/yesterday/.test(lower)) {
    baseDate = new Date(baseDate.getTime() - MS_IN_DAY);
  } else if (!hasToday) {
    for (const weekday of WEEKDAYS) {
      if (lower.includes(weekday)) {
        baseDate = resolveWeekday(reference, weekday) ?? baseDate;
        break;
      }
    }
    const explicitDate = lower.match(/(\d{4}-\d{2}-\d{2})/);
    if (explicitDate) {
      baseDate = startOfDay(new Date(explicitDate[1]));
    }
    const monthDay = lower.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})/);
    if (monthDay) {
      const monthIndex = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(monthDay[1]);
      const date = new Date(reference);
      date.setMonth(monthIndex, Number(monthDay[2]));
      date.setHours(0,0,0,0);
      baseDate = date;
    }
  }

  if (times.length) {
    const [{ time }] = times;
    const start = new Date(baseDate);
    start.setHours(time.hours, time.minutes, 0, 0);
    result.startAt = start;
    if (result.durationMinutes) {
      result.endAt = new Date(start.getTime() + result.durationMinutes * MS_IN_MINUTE);
    }
  } else {
    if (hasMorning) {
      const start = new Date(baseDate);
      start.setHours(9, 0, 0, 0);
      result.startAt = start;
    } else if (hasAfternoon) {
      const start = new Date(baseDate);
      start.setHours(14, 0, 0, 0);
      result.startAt = start;
    } else if (hasEvening || hasTonight) {
      const start = new Date(baseDate);
      start.setHours(19, 0, 0, 0);
      result.startAt = start;
    }
  }

  const dueMatch = lower.match(/by\s+((?:fri|mon|tue|wed|thu|sat|sun)[a-z]*)(?:\s+(\d{1,2}:\d{2}(?:\s*(?:am|pm))?))?/);
  if (dueMatch) {
    const weekday = dueMatch[1];
    const timeToken = dueMatch[2];
    let dueDate = startOfDay(reference);
    const idx = WEEKDAYS.findIndex((d) => weekday.startsWith(d.slice(0,3)));
    if (idx >= 0) {
      const diff = (idx + 7 - dueDate.getDay()) % 7;
      dueDate = new Date(dueDate.getTime() + diff * MS_IN_DAY);
    }
    if (timeToken) {
      const parsed = parseTimeToken(timeToken);
      if (parsed) {
        dueDate.setHours(parsed.hours, parsed.minutes, 0, 0);
      }
    } else {
      dueDate.setHours(17, 0, 0, 0);
    }
    result.dueAt = dueDate;
  }

  if (!result.startAt && result.dueAt && result.durationMinutes) {
    result.startAt = new Date(result.dueAt.getTime() - result.durationMinutes * MS_IN_MINUTE);
    result.endAt = result.dueAt;
  }

  if (!result.durationMinutes && result.startAt && result.endAt) {
    result.durationMinutes = Math.round((result.endAt - result.startAt) / MS_IN_MINUTE);
  }

  return result;
}

export function formatISO(date) {
  return date ? new Date(date).toISOString() : null;
}

export function minutesBetween(start, end) {
  return Math.round((new Date(end) - new Date(start)) / MS_IN_MINUTE);
}

export function isWithin(date, window) {
  const [startHour, startMinute] = window.start.split(":").map(Number);
  const [endHour, endMinute] = window.end.split(":").map(Number);
  const d = new Date(date);
  const minutes = d.getHours() * 60 + d.getMinutes();
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return minutes >= start && minutes <= end;
}

export function toDurationISO(minutes) {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `PT${hours}H${mins}M`;
  if (hours) return `PT${hours}H`;
  return `PT${mins}M`;
}
