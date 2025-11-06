import OpenAI from "openai";

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const parseEntryToItem = async (freeText: string) => {
  const system = `You convert a user's free-text into a structured JSON item for a Work+Life tracker.
- Identify: type (TASK/EVENT/NOTE/HABIT/GOAL/IDEA/DECISION/LOG/REMINDER), scope (WORK/PERSONAL/BOTH).
- Extract: title, description, dueAt, startAt, endAt, durationEstMins, recurrence (RRULE), location, priority (0-5), contexts, tags.
- Prefer conservative times; if only time is given ("19:00"), assume today in user locale.
- If ambiguous, infer sensibly and set aiConfidence < 0.7.
- Output strictly the JSON object of ItemDTO.`;

  const user = `Entry: ${freeText}`;

  const res = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    temperature: 0.2,
    response_format: { type: "json_object" } as any,
  });

  const content = res.choices[0]?.message?.content?.trim() || "{}";
  return JSON.parse(content);
};
