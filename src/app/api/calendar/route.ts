import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseCalendarDate } from "@/lib/calendar";
import { z } from "zod";

const entrySchema = z.object({
  date: z.string(),
  outfitId: z.string().min(1),
  type: z.enum(["PLANNED", "WORN"]),
  notes: z.string().trim().max(500).optional(),
});

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  let start: Date | undefined;
  let end: Date | undefined;
  try {
    if (url.searchParams.get("start"))
      start = parseCalendarDate(url.searchParams.get("start")!);
    if (url.searchParams.get("end"))
      end = parseCalendarDate(url.searchParams.get("end")!);
  } catch {
    return NextResponse.json({ error: "Rango no válido" }, { status: 400 });
  }
  const entries = await db.outfitCalendarEntry.findMany({
    where: {
      userId: user.id,
      date: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) },
    },
    include: {
      outfit: {
        include: { previewMedia: true, realPhotoMedia: true, _count: { select: { items: true } } },
      },
    },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(entries.map((entry) => ({ ...entry, outfit: { ...entry.outfit, previewMedia: entry.outfit.preferRealPhoto ? entry.outfit.realPhotoMedia || entry.outfit.previewMedia : entry.outfit.previewMedia || entry.outfit.realPhotoMedia } })));
}

export async function POST(request: Request) {
  const user = await requireUser();
  const parsed = entrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Revisa la fecha y el conjunto" },
      { status: 400 },
    );
  const outfit = await db.outfit.findFirst({
    where: { id: parsed.data.outfitId, ownerId: user.id },
  });
  if (!outfit)
    return NextResponse.json({ error: "Conjunto no válido" }, { status: 403 });
  let date: Date;
  try {
    date = parseCalendarDate(parsed.data.date);
  } catch {
    return NextResponse.json({ error: "Fecha no válida" }, { status: 400 });
  }
  const entry = await db.outfitCalendarEntry.upsert({
    where: { userId_date: { userId: user.id, date } },
    update: {
      outfitId: outfit.id,
      type: parsed.data.type,
      notes: parsed.data.notes,
    },
    create: {
      userId: user.id,
      outfitId: outfit.id,
      date,
      type: parsed.data.type,
      notes: parsed.data.notes,
    },
    include: { outfit: { include: { previewMedia: true, realPhotoMedia: true } } },
  });
  return NextResponse.json({ ...entry, outfit: { ...entry.outfit, previewMedia: entry.outfit.preferRealPhoto ? entry.outfit.realPhotoMedia || entry.outfit.previewMedia : entry.outfit.previewMedia || entry.outfit.realPhotoMedia } });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const dateValue = new URL(request.url).searchParams.get("date");
  if (!dateValue)
    return NextResponse.json({ error: "Fecha necesaria" }, { status: 400 });
  let date: Date;
  try {
    date = parseCalendarDate(dateValue);
  } catch {
    return NextResponse.json({ error: "Fecha no válida" }, { status: 400 });
  }
  await db.outfitCalendarEntry.deleteMany({ where: { userId: user.id, date } });
  return NextResponse.json({ ok: true });
}
