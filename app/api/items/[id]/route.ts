import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/server/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const updated = await prisma.item.update({
    where: { id: params.id },
    data: body,
  });
  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.item.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
