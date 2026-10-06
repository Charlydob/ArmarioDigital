import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { outfitSchema } from "@/lib/validation";
import { normalizeLayers } from "@/lib/editor";
import { removeMedia, saveImage } from "@/lib/storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const outfit = await db.outfit.findFirst({ where: { id, ownerId: user.id }, include: { previewMedia: true, realPhotoMedia: true, pose: { include: { normalizedMedia: true } }, items: { include: { garment: { include: { processedMedia: true, thumbnailMedia: true } } }, orderBy: { layerOrder: "asc" } } } });
  return outfit ? NextResponse.json(outfit) : NextResponse.json({ error: "No encontrado" }, { status: 404 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const old = await db.outfit.findFirst({ where: { id, ownerId: user.id }, include: { previewMedia: true } });
  if (!old) return NextResponse.json({ error: "Conjunto no encontrado" }, { status: 404 });
  const form = await request.formData();
  let payload: unknown;
  try { payload = JSON.parse(String(form.get("data"))); } catch { return NextResponse.json({ error: "Datos no válidos" }, { status: 400 }); }
  const parsed = outfitSchema.safeParse(payload);
  const preview = form.get("preview");
  if (!parsed.success || !(preview instanceof File)) return NextResponse.json({ error: "Revisa el conjunto" }, { status: 400 });
  const pose = await db.pose.findFirst({ where: { id: parsed.data.poseId, ownerId: user.id } });
  const count = await db.garment.count({ where: { ownerId: user.id, id: { in: parsed.data.items.map((i) => i.garmentId) } } });
  if (!pose || count !== new Set(parsed.data.items.map((i) => i.garmentId)).size) return NextResponse.json({ error: "Contenido no válido" }, { status: 403 });
  const media = await saveImage(user.id, preview);
  const data = parsed.data;
  const outfit = await db.$transaction(async (tx) => {
    await tx.outfitItem.deleteMany({ where: { outfitId: id } });
    return tx.outfit.update({ where: { id }, data: { name: data.name, notes: data.notes, poseId: data.poseId, previewMediaId: media.id, items: { create: normalizeLayers(data.items) } }, include: { items: true } });
  });
  if (old.previewMedia) { await db.media.delete({ where: { id: old.previewMedia.id } }).catch(() => undefined); await removeMedia(old.previewMedia.path); }
  return NextResponse.json(outfit);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const outfit = await db.outfit.findFirst({ where: { id, ownerId: user.id }, include: { previewMedia: true, realPhotoMedia: true, aiTryOnJobs: { include: { resultMedia: true } } } });
  if (!outfit) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  await db.outfit.delete({ where: { id } });
  if (outfit.previewMedia) { await db.media.delete({ where: { id: outfit.previewMedia.id } }).catch(() => undefined); await removeMedia(outfit.previewMedia.path); }
  if (outfit.realPhotoMedia) { await db.media.delete({ where: { id: outfit.realPhotoMedia.id } }).catch(() => undefined); await removeMedia(outfit.realPhotoMedia.path); }
  for (const job of outfit.aiTryOnJobs) if (job.resultMedia) { await db.media.delete({ where: { id: job.resultMedia.id } }).catch(() => undefined); await removeMedia(job.resultMedia.path); }
  return NextResponse.json({ ok: true });
}
