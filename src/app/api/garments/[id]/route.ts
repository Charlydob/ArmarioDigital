import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { garmentSchema } from "@/lib/validation";
import { removeMedia } from "@/lib/storage";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const existing = await db.garment.findFirst({ where: { id, ownerId: user.id } });
  if (!existing) return NextResponse.json({ error: "Prenda no encontrada" }, { status: 404 });
  const body = await request.json();
  const parsed = garmentSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  return NextResponse.json(await db.garment.update({ where: { id }, data: parsed.data }));
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const garment = await db.garment.findFirst({ where: { id, ownerId: user.id }, include: { _count: { select: { outfitItems: true } }, originalMedia: true, processedMedia: true, thumbnailMedia: true } });
  if (!garment) return NextResponse.json({ error: "Prenda no encontrada" }, { status: 404 });
  if (garment._count.outfitItems) return NextResponse.json({ error: `Esta prenda se usa en ${garment._count.outfitItems} conjunto(s). Quítala de ellos primero.` }, { status: 409 });
  const mediaIds = [garment.originalMediaId, garment.processedMediaId, garment.thumbnailMediaId].filter(Boolean) as string[];
  await db.$transaction([db.garment.delete({ where: { id } }), db.media.deleteMany({ where: { id: { in: mediaIds } } })]);
  await Promise.all([removeMedia(garment.originalMedia.path), removeMedia(garment.processedMedia.path), removeMedia(garment.thumbnailMedia?.path)]);
  return NextResponse.json({ ok: true });
}
