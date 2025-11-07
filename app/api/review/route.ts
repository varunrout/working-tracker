import { NextResponse } from "next/server";
import { prisma } from "@/src/server/prisma";
import { openai } from "@/src/lib/openai";

export async function POST() {
  const thisWeek = await prisma.item.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  const prompt = `Create a concise weekly review with wins, blockers, and suggested focus, given these items: ${JSON.stringify(
    thisWeek
  )}`;

  const res = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  const summary = res.choices[0]?.message?.content || "";
  const saved = await prisma.review.create({ data: { period: "WEEKLY", summary } });
  return NextResponse.json({ review: saved });
}
