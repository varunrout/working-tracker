import { NextRequest, NextResponse } from "next/server";
import { parseEntryToItem } from "@/src/lib/openai";
import { normalizeItem } from "@/src/lib/postprocess";
import { prisma } from "@/src/server/prisma";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const aiItem = await parseEntryToItem(text);
    const item = normalizeItem(aiItem);

    const created = await prisma.item.create({
      data: {
        type: item.type,
        scope: item.scope,
        title: item.title,
        description: item.description,
        status: item.status,
        priority: item.priority ?? 2,
        tags: item.tags ?? [],
        contexts: item.contexts ?? [],
        startAt: item.startAt ? new Date(item.startAt) : undefined,
        endAt: item.endAt ? new Date(item.endAt) : undefined,
        dueAt: item.dueAt ? new Date(item.dueAt) : undefined,
        durationEstMins: item.durationEstMins ?? undefined,
        durationActualMins: item.durationActualMins ?? undefined,
        recurrence: item.recurrence ?? undefined,
        location: item.location ?? undefined,
        aiEntities: item.aiEntities ?? {},
        aiConfidence: item.aiConfidence ?? 0.8,
        dependencies: item.dependencies ?? [],
        source: item.source ?? "text",
      },
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
