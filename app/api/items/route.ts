import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/prisma";

export async function GET() {
  const items = await prisma.item.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const created = await prisma.item.create({ data: body });
  return NextResponse.json({ item: created }, { status: 201 });
}
